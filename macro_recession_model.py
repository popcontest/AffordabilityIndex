#!/usr/bin/env python3
"""
Macro Recession Model
=====================

A standalone macroeconomic model that pulls the longest available history of
US retail sales, consumer prices, and the S&P 500, aligns them onto a common
calendar, separates *nominal* growth from *real* (inflation-adjusted) growth,
and plots the result against the official NBER recession chronology.

The question the model is built to answer
-----------------------------------------
Nominal retail sales almost never fall. Prices rise, so the dollar value of
what Americans buy keeps drifting up even when the number of physical units
sold is collapsing. That makes nominal retail sales nearly useless as a
recession indicator on its own. Deflating it by CPI strips the price effect
out and leaves the part that actually matters: is the consumer buying *more*
or *less*? Consumer spending is roughly two thirds of US GDP, so a sustained
contraction in real retail sales is one of the most dependable coincident
markers of a recession. The S&P 500 is then laid over the top to show the
lead/lag structure -- equities are a *leading* indicator and typically turn
down months before the NBER-dated peak.

Data sources (all public, no API key required)
----------------------------------------------
  FRED (via pandas-datareader)
    CPIAUCSL  Consumer Price Index, All Urban Consumers, All Items, SA
              Monthly, 1947-01 -> present. The standard headline CPI.
    RSAFS     Advance Retail Sales: Retail and Food Services, SA
              Monthly, 1992-01 -> present. The modern NAICS-basis series.
    RETAIL    Retail Sales (discontinued SIC-basis series)
              Monthly, 1947-01 -> 2001-04. Spliced onto RSAFS to extend the
              retail history back to 1947 (see `splice_retail_series`).
    USREC     NBER Recession Indicator for the United States
              Monthly, 1854-12 -> present. 1 during a contraction, 0 otherwise.
    SP500     S&P 500 index level -- last-resort fallback only. FRED's license
              with S&P restricts this series to a rolling 10-year window.

  Yahoo Finance
    ^SPX / ^GSPC  S&P 500 index, daily closes back to 1927-12-30.

Outputs
-------
  macro_trend_analysis.xlsx   Fully merged dataset (monthly + daily sheets,
                              recession episode table, correlation tables,
                              current signal dashboard, source metadata).
  chart1_macro_timeseries.png Dual-axis time series with recession shading.
  chart2_correlation.png      Gap-vs-forward-return scatter + rolling
                              correlations, with recession shading.

Usage
-----
  python macro_recession_model.py
  python macro_recession_model.py --outdir ./macro_out --start 1960-01-01
  python macro_recession_model.py --rolling-window 60 --dpi 300

Dependencies
------------
  pandas numpy matplotlib pandas-datareader openpyxl
  yfinance   (optional -- the script falls back to Yahoo's public chart API
              and then to FRED if yfinance is missing or blocked)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
import warnings
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless-safe; must be set before pyplot is imported

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

warnings.filterwarnings("ignore", category=FutureWarning)

log = logging.getLogger("macro_recession_model")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

#: Earliest date we ever ask an API for. 1900 is well before any series here
#: begins, so every provider simply returns its full history.
EARLIEST_START = "1900-01-01"

#: FRED series pulled by the model. Keyed by the column name used downstream.
FRED_SERIES = {
    "cpi": "CPIAUCSL",
    "retail_nominal_modern": "RSAFS",
    "retail_nominal_legacy": "RETAIL",
    "recession": "USREC",
}

#: Yahoo tickers tried in order. ^SPX is the requested symbol; ^GSPC is the
#: same index under Yahoo's older ticker and is more reliably served.
SP500_TICKERS = ("^SPX", "^GSPC")

#: Overlap window used to level-shift the discontinued SIC retail series onto
#: the modern NAICS one. Both series exist over 1992-01 .. 2001-04.
SPLICE_OVERLAP = ("1992-01-01", "2001-04-01")

#: Retry policy for every network call. Yahoo returns HTTP 429 under load and
#: FRED will occasionally 503; both are transient, so we back off and retry.
MAX_RETRIES = 4
BACKOFF_BASE_SECONDS = 2.0

#: Rolling correlation window in months. 36 months is long enough to damp out
#: single-quarter noise but short enough to show regime changes.
DEFAULT_ROLLING_WINDOW = 36

# --- Chart palette ---------------------------------------------------------
# Validated for colour-vision deficiency: worst all-pairs deutan deltaE 9.2,
# worst normal-vision deltaE 24.0 against the #fcfcfb surface. Aqua sits below
# 3:1 contrast on the light surface, so the S&P series always carries a visible
# direct label in addition to the legend.
SURFACE = "#fcfcfb"
INK_PRIMARY = "#0b0b0b"
INK_SECONDARY = "#52514e"
INK_MUTED = "#7a7975"
GRID = "#e6e5e1"
C_RETAIL = "#2a78d6"  # blue    -- real retail sales growth
C_INFLATION = "#eb6834"  # orange  -- CPI inflation
C_SPX = "#1baf7a"  # aqua    -- S&P 500
C_RECESSION = "#e34948"  # red     -- recession marker / shading
ZERO_LINE = "#a8a7a2"


# ---------------------------------------------------------------------------
# Errors and provenance tracking
# ---------------------------------------------------------------------------


class DataFetchError(RuntimeError):
    """Raised when a required series cannot be retrieved after all retries."""


@dataclass
class Provenance:
    """Records where every column actually came from, for the Excel metadata
    sheet. Fallbacks are silent in the data but must never be silent in the
    output -- a chart built on FRED's 10-year S&P window looks identical to one
    built on Yahoo's 99-year history until you check the start date."""

    rows: list[dict] = field(default_factory=list)

    def add(self, column: str, source: str, series_id: str, frame: pd.DataFrame | pd.Series, note: str = "") -> None:
        idx = frame.index
        self.rows.append(
            {
                "column": column,
                "source": source,
                "series_id": series_id,
                "observations": int(len(frame)),
                "first_observation": idx.min().date().isoformat() if len(idx) else "",
                "last_observation": idx.max().date().isoformat() if len(idx) else "",
                "note": note,
            }
        )

    def to_frame(self) -> pd.DataFrame:
        return pd.DataFrame(self.rows)


# ---------------------------------------------------------------------------
# Fetch layer
# ---------------------------------------------------------------------------


def _with_retries(label: str, fn, *, retries: int = MAX_RETRIES):
    """Call `fn` with exponential backoff.

    Every provider used here throttles rather than hard-fails: FRED returns
    503s during releases, Yahoo returns 429 once you ask for a few decades of
    daily bars in quick succession. Backing off 2s / 4s / 8s / 16s clears both
    in practice. Anything still failing after the last attempt is re-raised as
    DataFetchError so the caller can decide whether the series is optional.
    """
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 -- provider errors are untyped
            last_exc = exc
            detail = str(exc).strip().splitlines()[0][:160] if str(exc).strip() else type(exc).__name__
            if attempt == retries:
                break
            delay = BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
            log.warning("%s failed (attempt %d/%d): %s -- retrying in %.0fs", label, attempt, retries, detail, delay)
            time.sleep(delay)
    raise DataFetchError(f"{label} failed after {retries} attempts: {last_exc}") from last_exc


def fetch_fred_series(series_id: str, start: str = EARLIEST_START) -> pd.Series:
    """Pull one FRED series as a float Series indexed by observation date."""
    from pandas_datareader import data as pdr  # imported lazily for a clean error

    def _pull() -> pd.Series:
        frame = pdr.DataReader(series_id, "fred", start=pd.Timestamp(start), end=pd.Timestamp.today())
        if frame is None or frame.empty:
            raise DataFetchError(f"FRED returned no rows for {series_id}")
        series = frame.iloc[:, 0].astype(float)
        series.index = pd.DatetimeIndex(series.index)
        return series.sort_index().dropna()

    series = _with_retries(f"FRED {series_id}", _pull)
    log.info("FRED %-10s %5d obs  %s -> %s", series_id, len(series), series.index.min().date(), series.index.max().date())
    return series


def _fetch_sp500_yfinance() -> tuple[pd.Series, str]:
    """Preferred path: yfinance, which handles Yahoo's auth dance for us."""
    import yfinance as yf

    errors = []
    for ticker in SP500_TICKERS:
        try:
            raw = yf.download(
                ticker,
                start=EARLIEST_START,
                progress=False,
                auto_adjust=False,
                threads=False,
            )
            if raw is None or raw.empty:
                errors.append(f"{ticker}: empty response")
                continue
            # yfinance returns a MultiIndex column frame for single tickers in
            # recent versions; flatten to the price level either way.
            if isinstance(raw.columns, pd.MultiIndex):
                raw = raw.droplevel(1, axis=1)
            col = "Adj Close" if "Adj Close" in raw.columns else "Close"
            series = raw[col].astype(float).dropna()
            series.index = pd.DatetimeIndex(series.index).tz_localize(None)
            return series.sort_index(), ticker
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{ticker}: {type(exc).__name__}: {str(exc).splitlines()[0][:120]}")
    raise DataFetchError("yfinance returned nothing for " + "; ".join(errors))


def _fetch_sp500_chart_api() -> tuple[pd.Series, str]:
    """Fallback: Yahoo's public chart endpoint hit with plain `requests`.

    yfinance talks to Yahoo through curl_cffi with a spoofed browser TLS
    fingerprint. That fingerprint gets reset by TLS-inspecting corporate
    proxies, so yfinance can fail on networks where ordinary HTTPS is fine.
    The chart endpoint below serves the same daily history over a normal
    requests session, which honours HTTPS_PROXY and the system CA bundle.
    """
    import requests

    # Explicit epoch bounds rather than `range=max`. This matters: asking for
    # `range=max&interval=1d` makes Yahoo silently downgrade the response to
    # quarterly bars (168 rows instead of ~25,000) with no error and no warning
    # -- the request succeeds and the data is simply the wrong frequency.
    # Passing period1/period2 returns genuine daily closes from 1927-12-30.
    period1 = -2208988800  # 1900-01-01 UTC; earlier than the index itself
    period2 = int(pd.Timestamp.now(tz="UTC").timestamp()) + 86400

    errors = []
    for ticker in SP500_TICKERS:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{requests.utils.quote(ticker)}"
        try:
            resp = requests.get(
                url,
                params={
                    "period1": period1,
                    "period2": period2,
                    "interval": "1d",
                    "includeAdjustedClose": "true",
                },
                headers={"User-Agent": "Mozilla/5.0 (compatible; macro-recession-model/1.0)"},
                timeout=60,
            )
            if resp.status_code == 429:
                raise DataFetchError("Yahoo rate limit (HTTP 429)")
            resp.raise_for_status()
            payload = resp.json()

            result = (payload.get("chart") or {}).get("result") or []
            if not result:
                err = ((payload.get("chart") or {}).get("error")) or "no result block"
                raise DataFetchError(f"Yahoo chart API: {json.dumps(err)[:160]}")
            block = result[0]

            # Guard against the silent-downgrade behaviour described above.
            granularity = (block.get("meta") or {}).get("dataGranularity")
            if granularity and granularity != "1d":
                raise DataFetchError(f"Yahoo returned '{granularity}' bars, expected daily")

            stamps = block.get("timestamp") or []
            indicators = block.get("indicators") or {}
            closes = None
            adj = indicators.get("adjclose") or []
            if adj and adj[0].get("adjclose"):
                closes = adj[0]["adjclose"]
            elif indicators.get("quote"):
                closes = indicators["quote"][0].get("close")
            if not stamps or not closes:
                raise DataFetchError("Yahoo chart API returned no price array")

            series = pd.Series(
                closes,
                index=pd.to_datetime(stamps, unit="s", utc=True).tz_convert(None).normalize(),
                dtype="float64",
            )
            return series.dropna().sort_index(), ticker
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{ticker}: {type(exc).__name__}: {str(exc).splitlines()[0][:120]}")
    raise DataFetchError("Yahoo chart API returned nothing for " + "; ".join(errors))


def fetch_sp500() -> tuple[pd.Series, str, str]:
    """Fetch the S&P 500 daily close, trying three independent paths.

    Returns (series, source_label, ticker). The fallback chain matters because
    the three paths have very different coverage: Yahoo gives 1927->present,
    while FRED's S&P licence caps it at a rolling 10 years -- enough to draw a
    chart, nowhere near enough to see a recession cycle.
    """
    attempts = (
        ("Yahoo Finance (yfinance)", _fetch_sp500_yfinance),
        ("Yahoo Finance (chart API)", _fetch_sp500_chart_api),
    )
    failures = []
    for label, fn in attempts:
        try:
            series, ticker = _with_retries(label, fn, retries=2)
            log.info("S&P 500 via %-27s %5d obs  %s -> %s", label, len(series), series.index.min().date(), series.index.max().date())
            return series, label, ticker
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{label}: {str(exc).splitlines()[0][:140]}")
            log.warning("%s unavailable -- trying next source", label)

    log.warning("Both Yahoo paths failed; falling back to FRED SP500 (10-year window only)")
    try:
        series = fetch_fred_series("SP500")
        return series, "FRED (fallback, 10-year window)", "SP500"
    except Exception as exc:  # noqa: BLE001
        failures.append(f"FRED SP500: {exc}")
        raise DataFetchError("Could not retrieve S&P 500 from any source:\n  " + "\n  ".join(failures)) from exc


# ---------------------------------------------------------------------------
# Series construction
# ---------------------------------------------------------------------------


def splice_retail_series(modern: pd.Series, legacy: pd.Series) -> tuple[pd.Series, str]:
    """Extend the modern NAICS retail series backwards with the legacy SIC one.

    RSAFS (1992->) and RETAIL (1947->2001) measure the same economic concept on
    different industry classifications, so their *levels* differ by a roughly
    constant factor while their *growth rates* track each other closely. We
    therefore ratio-adjust: scale the legacy series by the median RSAFS/RETAIL
    ratio over the overlap window, then use it only for dates before RSAFS
    begins. Growth rates -- the only thing this model actually consumes -- are
    unaffected by the scaling, and the one spliced YoY observation that spans
    the join (Jan 1992 vs Jan 1991) is computed on consistently scaled levels.
    """
    if legacy.empty:
        return modern, "RSAFS only (legacy series unavailable)"

    lo, hi = pd.Timestamp(SPLICE_OVERLAP[0]), pd.Timestamp(SPLICE_OVERLAP[1])
    overlap = pd.concat({"modern": modern, "legacy": legacy}, axis=1, sort=True).loc[lo:hi].dropna()
    if len(overlap) < 12:
        log.warning("Retail splice skipped: only %d overlapping months", len(overlap))
        return modern, "RSAFS only (insufficient overlap to splice)"

    ratio = float((overlap["modern"] / overlap["legacy"]).median())
    scaled_legacy = legacy * ratio
    spliced = pd.concat([scaled_legacy.loc[: modern.index.min() - pd.Timedelta(days=1)], modern]).sort_index()
    note = (
        f"RETAIL (SIC) x {ratio:.4f} spliced before {modern.index.min().date()}, "
        f"RSAFS (NAICS) thereafter; ratio = median over {len(overlap)} overlapping months"
    )
    log.info("Retail splice: %s", note)
    return spliced, note


def to_month_start(series: pd.Series) -> pd.Series:
    """Normalise a monthly series to month-start timestamps.

    FRED already stamps monthly observations on the first of the month, but
    normalising defensively means the merge below is a clean index join rather
    than a nearest-date guess.
    """
    out = series.copy()
    out.index = pd.DatetimeIndex(out.index).to_period("M").to_timestamp(how="start")
    return out[~out.index.duplicated(keep="last")].sort_index()


def build_daily_frame(
    spx: pd.Series,
    monthly_levels: dict[str, pd.Series],
) -> pd.DataFrame:
    """Align daily and monthly data on a shared business-day calendar.

    Frequency mismatch is the core alignment problem here: the S&P prints every
    trading day, CPI and retail sales print once a month with a multi-week
    reporting lag. We build a business-day spine and forward-fill the monthly
    series onto it. Forward-fill is the economically correct direction -- the
    March CPI figure is the most recent *known* reading for every day from its
    release until April's prints, so carrying it forward never leaks future
    information into a past date. Back-filling would.
    """
    if spx.empty:
        raise DataFetchError("S&P 500 series is empty; cannot build the daily frame")

    # Start where real economic data starts. USREC alone reaches back to 1854,
    # and anchoring the spine to it would prepend decades of rows carrying
    # nothing but a recession flag.
    substantive = {k: v for k, v in monthly_levels.items() if k != "recession" and len(v)}
    start = min([spx.index.min()] + [s.index.min() for s in substantive.values()])
    end = max([spx.index.max()] + [s.index.max() for s in monthly_levels.values() if len(s)])
    spine = pd.bdate_range(start=start, end=end, name="date")

    frame = pd.DataFrame(index=spine)
    # The index itself is daily and complete, so a plain reindex+ffill carries
    # the last observed close over weekends/holidays and market closures.
    frame["sp500"] = spx.reindex(spine).ffill()
    for name, series in monthly_levels.items():
        frame[name] = series.reindex(spine).ffill()
    return frame


def build_monthly_frame(
    spx: pd.Series,
    monthly_levels: dict[str, pd.Series],
) -> pd.DataFrame:
    """Collapse everything onto a monthly grid -- the analysis frequency.

    The S&P is reduced two ways because they answer different questions:
      * sp500_close  -- last trading day of the month. Matches how index
                        performance is conventionally quoted.
      * sp500_avg    -- mean of the month's daily closes. Less sensitive to a
                        single volatile session, which matters when correlating
                        against monthly-average macro aggregates.
    """
    # The month spine must span the union of every input, not just one of them.
    # Building the frame off the S&P's own resampled index and then assigning
    # the macro columns into it would silently truncate the sample to the
    # market history (1927->) and, worse, drop CPI and retail observations that
    # fall outside it entirely.
    normalised = {name: to_month_start(series) for name, series in monthly_levels.items()}
    starts = [s.index.min() for s in normalised.values() if len(s)] + [spx.index.min()]
    ends = [s.index.max() for s in normalised.values() if len(s)] + [spx.index.max()]
    spine = pd.date_range(
        start=pd.Timestamp(min(starts)).to_period("M").to_timestamp(how="start"),
        end=pd.Timestamp(max(ends)).to_period("M").to_timestamp(how="start"),
        freq="MS",
        name="date",
    )

    monthly = pd.DataFrame(index=spine)
    monthly["sp500_close"] = spx.resample("MS").last().reindex(spine)
    monthly["sp500_avg"] = spx.resample("MS").mean().reindex(spine)
    monthly["sp500_trading_days"] = spx.resample("MS").count().reindex(spine).fillna(0).astype(int)
    for name, series in normalised.items():
        monthly[name] = series.reindex(spine)

    # Forward-fill the *macro* columns only. CPI and retail sales are step
    # functions between releases, so a carried value is a real reading. The
    # S&P columns are deliberately left with NaN gaps: a month with no trading
    # data is a data hole, not a flat market, and filling it would invent
    # returns. USREC is likewise a published state, so it carries forward.
    for col in normalised:
        monthly[col] = monthly[col].ffill()

    # Trim to the first month that carries actual economic data. USREC alone
    # reaches back to 1854, and keeping those rows would pad the sample with
    # decades of recessions the model has no prices or sales for -- inflating
    # the recession count and filling the episode table with empty rows.
    # Check the level columns only. `sp500_trading_days` is zero-filled rather
    # than NaN-filled, so including it would make every row look populated.
    levels = ["sp500_close", *normalised.keys()]
    levels = [c for c in levels if c != "recession"]
    first = monthly.index[monthly[levels].notna().any(axis=1)]
    return monthly.loc[first.min():] if len(first) else monthly


def add_derived_metrics(monthly: pd.DataFrame) -> pd.DataFrame:
    """Compute the nominal / real / market metrics the model is built around.

    Every rate below is a 12-month change, which for monthly data both removes
    seasonality residue and gives the conventional "YoY" number that shows up
    in press coverage, so the output is directly comparable to published
    figures.
    """
    df = monthly.copy()

    # --- Nominal side ------------------------------------------------------
    # Retail sales in current dollars. Rises during inflation even when unit
    # volumes fall, which is exactly why it must not be read on its own.
    df["retail_yoy_nominal"] = df["retail_nominal"].pct_change(12) * 100.0

    # Headline CPI inflation, the deflator.
    df["cpi_yoy"] = df["cpi"].pct_change(12) * 100.0

    # --- Real side ---------------------------------------------------------
    # Deflate the level first, then difference. This yields the exact Fisher
    # relation  (1+nominal)/(1+inflation) - 1  rather than its approximation,
    # which matters once inflation runs high: at 14% CPI (1980) the shortcut
    # overstates real growth by more than a percentage point.
    df["retail_real"] = df["retail_nominal"] / (df["cpi"] / 100.0)
    df["retail_yoy_real"] = df["retail_real"].pct_change(12) * 100.0

    # The widely quoted shortcut, kept alongside so the difference is visible.
    df["retail_yoy_real_approx"] = df["retail_yoy_nominal"] - df["cpi_yoy"]

    # --- The gap -----------------------------------------------------------
    # inflation minus nominal retail growth. Positive means prices are rising
    # faster than the till receipts, i.e. households are paying more and taking
    # home less -- a real-volume contraction hiding inside a positive nominal
    # print. This is the single most informative derived column in the model
    # and it is (by construction) the negative of the approximate real rate.
    df["inflation_retail_gap"] = df["cpi_yoy"] - df["retail_yoy_nominal"]

    # --- Market side -------------------------------------------------------
    df["sp500_yoy"] = df["sp500_close"].pct_change(12) * 100.0
    # Real equity return: the index deflated by CPI. Nominal all-time highs in
    # an inflationary decade can still be a loss in purchasing power -- the
    # 1966-1982 period is the canonical example.
    df["sp500_real"] = df["sp500_close"] / (df["cpi"] / 100.0)
    df["sp500_yoy_real"] = df["sp500_real"].pct_change(12) * 100.0

    # Forward-looking return used by the scatter: what the market did over the
    # 12 months *after* each observation. Shifting by -12 deliberately places
    # future information on the row, which is legitimate for a backward-looking
    # study of "what followed this reading" but must never be used as a feature.
    df["sp500_fwd_12m"] = (df["sp500_close"].shift(-12) / df["sp500_close"] - 1.0) * 100.0

    # --- Recession flag ----------------------------------------------------
    # USREC is 1 for every month from the month *following* an NBER-dated peak
    # through the month of the trough. NBER announces these dates with a lag of
    # six to eighteen months, so the flag is a historical label, not a real-time
    # signal -- which is the whole reason the leading indicators below matter.
    df["recession"] = df["recession"].fillna(0).astype(int)

    return df


# ---------------------------------------------------------------------------
# Recession chronology and signal analysis
# ---------------------------------------------------------------------------


def recession_periods(recession_flag: pd.Series) -> list[tuple[pd.Timestamp, pd.Timestamp]]:
    """Convert the monthly 0/1 USREC flag into (start, end) contraction spans.

    Each span runs from the first flagged month to the month after the last
    flagged month, so the shaded band on the chart covers the full duration of
    the contraction rather than stopping at the trough's month-start tick.
    """
    flag = recession_flag.fillna(0).astype(int)
    if flag.empty:
        return []

    spans: list[tuple[pd.Timestamp, pd.Timestamp]] = []
    in_recession = False
    start: pd.Timestamp | None = None
    for date, value in flag.items():
        if value == 1 and not in_recession:
            in_recession, start = True, date
        elif value == 0 and in_recession:
            spans.append((start, date))
            in_recession = False
    if in_recession and start is not None:
        # Still contracting as of the last observation.
        spans.append((start, flag.index[-1] + pd.DateOffset(months=1)))
    return spans


def recession_table(
    df: pd.DataFrame,
    spans: list[tuple[pd.Timestamp, pd.Timestamp]],
    daily_prices: pd.Series,
) -> pd.DataFrame:
    """Per-recession summary: how retail volumes and the market behaved.

    Market statistics are computed on *daily* closes, not the monthly frame.
    Monthly resolution badly misstates both of them: the February-March 2020
    crash was a 34% peak-to-trough fall that opened and closed inside two
    calendar months, so month-end closes show a drawdown of exactly zero. The
    same effect flatters 1953 and blurs every peak date by up to a month.

    `sp500_peak_lead_months` is the headline result: how far ahead of the NBER
    business-cycle peak the market topped out. Note that USREC's first flagged
    month is the month *after* the peak, so the peak month is `start - 1` and
    the lead is measured against that -- otherwise every figure here would be
    inflated by a month.
    """
    rows = []
    for start, end in spans:
        window = df.loc[start:end]
        if window.empty:
            continue

        # NBER peak month: USREC turns on the month after the cycle peak.
        peak_month = start - pd.DateOffset(months=1)

        prices = daily_prices.loc[peak_month:end].dropna()

        # Search for the market top only in the two years *up to* the end of the
        # NBER peak month. Letting the search run into the contraction breaks
        # the measure: the 1982 recovery rally cleared the pre-recession high
        # before the recession was even over, which would report the market as
        # peaking 16 months *after* the economy rather than 8 months before it.
        peak_month_end = peak_month + pd.offsets.MonthEnd(0)
        pre = daily_prices.loc[peak_month - pd.DateOffset(months=24) : peak_month_end].dropna()
        lead = np.nan
        if not pre.empty:
            # NBER dates cycle peaks to a month, not a day, so the peak is taken
            # as month-end. A near-zero lead means the market topped out in the
            # same month the economy did.
            lead = round((peak_month_end - pre.idxmax()).days / 30.44, 1)

        rows.append(
            {
                "start": start.date().isoformat(),
                "end": end.date().isoformat(),
                "duration_months": int(round((end - start).days / 30.44)),
                "min_real_retail_yoy_pct": _r(window["retail_yoy_real"].min()),
                "mean_cpi_yoy_pct": _r(window["cpi_yoy"].mean()),
                "sp500_drawdown_pct": _r(_drawdown(prices)),
                "sp500_total_return_pct": _r(_total_return(prices)),
                "sp500_peak_lead_months": lead,
                "real_retail_negative_before_start": _months_negative_before(df, start),
            }
        )
    return pd.DataFrame(rows)


def _drawdown(prices: pd.Series) -> float:
    """Worst peak-to-trough decline within the window, in percent."""
    prices = prices.dropna()
    if len(prices) < 2:
        return np.nan
    return float((prices / prices.cummax() - 1.0).min() * 100.0)


def _total_return(prices: pd.Series) -> float:
    prices = prices.dropna()
    if len(prices) < 2:
        return np.nan
    return float((prices.iloc[-1] / prices.iloc[0] - 1.0) * 100.0)


def _months_negative_before(df: pd.DataFrame, start: pd.Timestamp) -> int:
    """How many of the 12 months before the recession had negative real retail
    growth. A high count is the model's early-warning read: consumers stop
    buying before the NBER says anything."""
    pre = df.loc[start - pd.DateOffset(months=12) : start - pd.DateOffset(months=1), "retail_yoy_real"]
    return int((pre < 0).sum())


def lead_lag_correlation(df: pd.DataFrame, max_lag: int = 24) -> pd.DataFrame:
    """Cross-correlate S&P YoY against real retail growth at a range of lags.

    Positive `lead_months` = the S&P series is shifted *forward*, so the
    correlation measures how well the market's move today predicts real retail
    growth N months from now. The lag with the highest correlation is the
    empirical estimate of how far equities lead the consumer.
    """
    rows = []
    for lag in range(-max_lag, max_lag + 1):
        corr = df["sp500_yoy"].shift(lag).corr(df["retail_yoy_real"])
        rows.append({"lead_months": lag, "corr_spx_vs_real_retail": _r(corr, 4)})
    return pd.DataFrame(rows)


def correlation_matrix(df: pd.DataFrame) -> pd.DataFrame:
    cols = [
        "retail_yoy_nominal",
        "retail_yoy_real",
        "cpi_yoy",
        "inflation_retail_gap",
        "sp500_yoy",
        "sp500_yoy_real",
        "sp500_fwd_12m",
    ]
    available = [c for c in cols if c in df.columns]
    return df[available].corr().round(4)


def current_signals(df: pd.DataFrame) -> pd.DataFrame:
    """A dashboard of the latest reading on each recession indicator.

    Thresholds are conventional rules of thumb drawn from the historical record
    in `recession_table`, not fitted parameters. They are directional guides:
    every one of them has fired outside a recession at some point (most
    famously the 2022 real-retail dip, which did not become a recession because
    employment held up).
    """
    latest = df.dropna(subset=["retail_yoy_real"]).iloc[-1]
    as_of = latest.name.date().isoformat()
    last12 = df.dropna(subset=["retail_yoy_real"]).tail(12)

    def row(indicator: str, value, threshold: str, triggered: bool, reading: str) -> dict:
        return {
            "as_of": as_of,
            "indicator": indicator,
            "value": _r(value),
            "warning_threshold": threshold,
            "triggered": bool(triggered),
            "interpretation": reading,
        }

    real_yoy = float(latest["retail_yoy_real"])
    gap = float(latest["inflation_retail_gap"])
    spx_yoy = float(latest["sp500_yoy"]) if pd.notna(latest.get("sp500_yoy")) else np.nan
    months_neg = int((last12["retail_yoy_real"] < 0).sum())

    return pd.DataFrame(
        [
            row(
                "Real retail sales YoY (%)",
                real_yoy,
                "< 0%",
                real_yoy < 0,
                "Consumers are buying less in volume terms -- the strongest coincident marker in this model.",
            ),
            row(
                "Months of negative real retail growth in last 12",
                months_neg,
                ">= 3",
                months_neg >= 3,
                "A single negative month is noise; a sustained run is what precedes NBER-dated contractions.",
            ),
            row(
                "Inflation minus nominal retail growth (pp)",
                gap,
                "> 0 pp",
                gap > 0,
                "Positive means price increases are outrunning till receipts: real volumes shrinking behind a positive nominal print.",
            ),
            row(
                "CPI YoY (%)",
                float(latest["cpi_yoy"]),
                "> 4%",
                float(latest["cpi_yoy"]) > 4,
                "High inflation both squeezes real spending and invites the rate hikes that historically trigger the downturn.",
            ),
            row(
                "S&P 500 YoY (%)",
                spx_yoy,
                "< 0%",
                bool(spx_yoy < 0) if pd.notna(spx_yoy) else False,
                "Equities lead: the index has typically peaked several months before the NBER-dated business cycle peak.",
            ),
            row(
                "NBER recession flag (USREC)",
                int(latest["recession"]),
                "= 1",
                int(latest["recession"]) == 1,
                "Official but lagging -- NBER dates recessions 6-18 months after the fact, so a 0 here rules nothing out.",
            ),
        ]
    )


def _r(value, digits: int = 2):
    """Round, tolerating NaN and non-numerics."""
    try:
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return np.nan
        return round(float(value), digits)
    except (TypeError, ValueError):
        return value


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------


def _style_axes(ax) -> None:
    ax.set_facecolor(SURFACE)
    ax.grid(True, color=GRID, linewidth=0.8, alpha=0.9)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GRID)
        ax.spines[side].set_linewidth(1.0)
    ax.tick_params(colors=INK_SECONDARY, labelsize=9, length=0)


def _robust_limits(values: pd.Series, q: float = 0.004, pad_frac: float = 0.09, step: float = 5.0):
    """Axis bounds that ignore a handful of extreme observations.

    Both charts are dominated otherwise by the COVID months: April 2020 real
    retail sales fell ~20% YoY and April 2021 rose ~47% against that base, and
    a couple of 2020-21 observations push the inflation/retail gap past -45pp.
    Scaling the axis to those four or five points squeezes seventy years of
    ordinary business cycles into the middle third of the panel. We therefore
    scale to the bulk of the distribution and state, on the chart, how many
    observations fall outside it -- clipped, never silently dropped.

    Returns (low, high, n_outside, series_of_outliers).
    """
    values = values.dropna()
    if values.empty:
        return None, None, 0, values
    lo_q, hi_q = float(values.quantile(q)), float(values.quantile(1 - q))
    pad = pad_frac * max(hi_q - lo_q, 1e-9)
    low = float(np.floor((lo_q - pad) / step) * step)
    high = float(np.ceil((hi_q + pad) / step) * step)
    outside = values[(values < low) | (values > high)]
    return low, high, len(outside), outside


def _shade_recessions(ax, spans, label_once: bool = True) -> None:
    """Overlay NBER contraction bands.

    Drawn first and kept low-alpha so the data lines read on top of them. Every
    band is one officially dated peak-to-trough contraction; the shading is
    what turns three abstract time series into a recession study.
    """
    for i, (start, end) in enumerate(spans):
        ax.axvspan(
            start,
            end,
            color=C_RECESSION,
            alpha=0.11,
            linewidth=0,
            zorder=0,
            label="NBER recession" if (i == 0 and label_once) else None,
        )


def chart1_timeseries(df: pd.DataFrame, spans, outpath: Path, dpi: int) -> Path:
    """Chart 1 -- dual-axis time series.

    Note on the dual axis: two y-scales on one plot make the crossing points of
    the two series an artefact of the scaling rather than a fact about the data,
    so the visual "S&P overtakes inflation here" reading is not meaningful. It
    is used here because the brief calls for it and because the pairing is the
    defensible case for it -- percentage growth rates against an index *level*
    have no shared unit at all. Mitigations: the right axis is log-scaled (so
    its slope reads as percentage change, matching the left axis's units), and
    both the axis label and the tick colour are tied to the S&P series colour so
    each line's scale is unambiguous.
    """
    fig, ax = plt.subplots(figsize=(15, 8.2))
    fig.patch.set_facecolor(SURFACE)
    _style_axes(ax)
    _shade_recessions(ax, spans)

    plot_df = df.loc[df[["retail_yoy_real", "cpi_yoy", "sp500_close"]].notna().any(axis=1)]

    # --- Left axis: year-over-year rates, in percent ------------------------
    ax.axhline(0, color=ZERO_LINE, linewidth=1.1, zorder=1)
    ax.plot(plot_df.index, plot_df["retail_yoy_real"], color=C_RETAIL, linewidth=2.0, zorder=3,
            label="Real retail sales, YoY %")
    ax.plot(plot_df.index, plot_df["cpi_yoy"], color=C_INFLATION, linewidth=2.0, zorder=3,
            label="CPI inflation, YoY %")

    ax.set_ylabel("Year-over-year change (%)", color=INK_SECONDARY, fontsize=11, labelpad=10)
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:+.0f}%"))
    ax.set_xlabel("")

    # Scale the rate axis to the bulk of the distribution so the pre-2020
    # cycles stay legible, and say so if anything is clipped.
    rates = pd.concat([plot_df["retail_yoy_real"], plot_df["cpi_yoy"]])
    low, high, n_off, outliers = _robust_limits(rates)
    if low is not None:
        ax.set_ylim(low, high)
        if n_off:
            worst = outliers.loc[outliers.abs().idxmax()]
            ax.annotate(
                f"{n_off} month{'s' if n_off > 1 else ''} clipped "
                f"(most extreme {worst:+.0f}%, {outliers.abs().idxmax():%b %Y})",
                xy=(0.995, 0.015), xycoords="axes fraction", ha="right", va="bottom",
                fontsize=8.5, color=INK_MUTED,
            )

    # --- Right axis: S&P 500 index level, log scale -------------------------
    ax2 = ax.twinx()
    ax2.set_yscale("log")
    ax2.plot(plot_df.index, plot_df["sp500_close"], color=C_SPX, linewidth=1.8, alpha=0.95, zorder=2,
             label="S&P 500 index (right, log)")
    ax2.set_ylabel("S&P 500 index level (log scale)", color=C_SPX, fontsize=11, labelpad=12)
    ax2.tick_params(axis="y", colors=C_SPX, labelsize=9, length=0)
    ax2.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}"))
    for side in ("top", "left"):
        ax2.spines[side].set_visible(False)
    ax2.spines["right"].set_color(C_SPX)
    ax2.spines["right"].set_alpha(0.5)
    ax2.grid(False)

    # Direct label on the S&P line. Aqua falls below 3:1 contrast against the
    # chart surface, so the palette's relief rule requires a visible label in
    # addition to the legend entry.
    spx_last = plot_df["sp500_close"].dropna()
    if not spx_last.empty:
        ax2.annotate(
            f"S&P 500  {spx_last.iloc[-1]:,.0f}",
            xy=(spx_last.index[-1], spx_last.iloc[-1]),
            xytext=(-8, -22),
            textcoords="offset points",
            ha="right",
            va="top",
            fontsize=9.5,
            fontweight="bold",
            color=INK_PRIMARY,
            bbox=dict(boxstyle="round,pad=0.28", facecolor=SURFACE, edgecolor=C_SPX, linewidth=1.0, alpha=0.95),
        )

    ax.xaxis.set_major_locator(mdates.YearLocator(10))
    ax.xaxis.set_minor_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax.set_xlim(plot_df.index.min(), plot_df.index.max())
    ax.set_zorder(ax2.get_zorder() + 1)
    ax.patch.set_visible(False)

    handles = [
        Line2D([], [], color=C_RETAIL, linewidth=2.4, label="Real retail sales, YoY %  (left)"),
        Line2D([], [], color=C_INFLATION, linewidth=2.4, label="CPI inflation, YoY %  (left)"),
        Line2D([], [], color=C_SPX, linewidth=2.4, label="S&P 500 index  (right, log)"),
        Patch(facecolor=C_RECESSION, alpha=0.18, label="NBER recession"),
    ]
    legend = ax.legend(handles=handles, loc="upper left", frameon=True, fontsize=10, ncol=2,
                       borderpad=0.7, handlelength=2.2, columnspacing=1.6, framealpha=1.0)
    legend.get_frame().set_facecolor(SURFACE)
    legend.get_frame().set_edgecolor(GRID)
    for text in legend.get_texts():
        text.set_color(INK_SECONDARY)

    span = f"{plot_df.index.min():%b %Y} – {plot_df.index.max():%b %Y}"
    fig.suptitle("Real consumer spending, inflation and the S&P 500 across the business cycle",
                 x=0.055, ha="left", fontsize=17, fontweight="bold", color=INK_PRIMARY, y=0.975)
    ax.set_title(
        f"Monthly, {span}. Real retail sales = nominal retail sales deflated by CPI-U. "
        "Shaded bands are NBER-dated contractions.",
        loc="left", fontsize=10.5, color=INK_SECONDARY, pad=14,
    )
    fig.text(0.055, 0.018,
             "Sources: FRED (CPIAUCSL, RSAFS/RETAIL, USREC) · Yahoo Finance (S&P 500)",
             fontsize=8.5, color=INK_MUTED, ha="left")

    # Explicit margins rather than tight_layout: the twinned right-hand axis is
    # not compatible with it, and fixed fractions keep the two charts visually
    # consistent with each other.
    fig.subplots_adjust(left=0.062, right=0.925, top=0.865, bottom=0.095)
    fig.savefig(outpath, dpi=dpi, facecolor=SURFACE)
    plt.close(fig)
    log.info("Wrote %s", outpath)
    return outpath


def chart2_correlation(df: pd.DataFrame, spans, outpath: Path, dpi: int, window: int) -> Path:
    """Chart 2 -- how the market responds to a widening inflation/retail gap.

    Panel A is the cross-sectional view: every month is a dot placed by how far
    inflation was outrunning nominal retail growth, against what the S&P went on
    to do over the following twelve months. Recession months are separated by
    colour *and* by marker shape, so the split survives greyscale printing and
    colour-vision deficiency.

    Panel B is the time-varying view: a rolling correlation of the market
    against real retail growth and against the gap. Correlation is not stable
    across regimes -- it tightens sharply around recessions, which is precisely
    when the relationship is being used.
    """
    fig, (ax_a, ax_b) = plt.subplots(
        1, 2, figsize=(16, 7.4), gridspec_kw={"width_ratios": [1.0, 1.25], "wspace": 0.22}
    )
    fig.patch.set_facecolor(SURFACE)

    # ---------------- Panel A: scatter -------------------------------------
    _style_axes(ax_a)
    scat = df.dropna(subset=["inflation_retail_gap", "sp500_fwd_12m"])
    exp = scat[scat["recession"] == 0]
    rec = scat[scat["recession"] == 1]

    ax_a.axhline(0, color=ZERO_LINE, linewidth=1.1, zorder=1)
    ax_a.axvline(0, color=ZERO_LINE, linewidth=1.1, zorder=1)
    ax_a.scatter(exp["inflation_retail_gap"], exp["sp500_fwd_12m"], s=22, marker="o",
                 facecolor=C_RETAIL, edgecolor=SURFACE, linewidth=0.6, alpha=0.62, zorder=3,
                 label=f"Expansion month  (n={len(exp):,})")
    ax_a.scatter(rec["inflation_retail_gap"], rec["sp500_fwd_12m"], s=40, marker="^",
                 facecolor=C_RECESSION, edgecolor=SURFACE, linewidth=0.7, alpha=0.9, zorder=4,
                 label=f"NBER recession month  (n={len(rec):,})")

    # Least-squares fit across all months, with the Pearson r reported so the
    # strength of the relationship is stated numerically rather than eyeballed.
    r_value = np.nan
    if len(scat) > 24:
        slope, intercept = np.polyfit(scat["inflation_retail_gap"], scat["sp500_fwd_12m"], 1)
        xs = np.linspace(scat["inflation_retail_gap"].min(), scat["inflation_retail_gap"].max(), 100)
        ax_a.plot(xs, slope * xs + intercept, color=INK_PRIMARY, linewidth=1.8, linestyle="--", alpha=0.75, zorder=5)
        r_value = float(scat["inflation_retail_gap"].corr(scat["sp500_fwd_12m"]))
        ax_a.annotate(
            f"OLS fit:  {slope:+.2f} pp market return\nper +1 pp of gap    (r = {r_value:+.2f})",
            xy=(0.03, 0.04), xycoords="axes fraction", fontsize=9.5, color=INK_SECONDARY, va="bottom",
            bbox=dict(boxstyle="round,pad=0.4", facecolor=SURFACE, edgecolor=GRID, linewidth=1.0),
        )

    # Clip the handful of COVID-era gap readings that would otherwise stretch
    # the x-axis to -48pp and leave the real cloud of points crushed into a
    # narrow band. Clipped counts are stated on the panel.
    low, high, n_off, _ = _robust_limits(scat["inflation_retail_gap"], q=0.005, step=2.5)
    if low is not None:
        ax_a.set_xlim(low, high)
        if n_off:
            ax_a.annotate(f"{n_off} outlying month{'s' if n_off > 1 else ''} off scale",
                          xy=(0.015, 0.985), xycoords="axes fraction", ha="left", va="top",
                          fontsize=8.5, color=INK_MUTED)

    ax_a.set_xlabel("Inflation minus nominal retail growth (pp)\n← retail outpacing prices    prices outpacing retail →",
                    color=INK_SECONDARY, fontsize=10.5, labelpad=16)
    ax_a.set_ylabel("S&P 500 return over the NEXT 12 months (%)", color=INK_SECONDARY, fontsize=10.5, labelpad=8)
    ax_a.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:+.0f}"))
    ax_a.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:+.0f}%"))
    ax_a.set_title("A.  Market response to a widening inflation/retail gap",
                   loc="left", fontsize=12.5, fontweight="bold", color=INK_PRIMARY, pad=12)
    leg_a = ax_a.legend(loc="upper right", frameon=True, fontsize=9.5, borderpad=0.6, framealpha=1.0)
    leg_a.get_frame().set_facecolor(SURFACE)
    leg_a.get_frame().set_edgecolor(GRID)
    for text in leg_a.get_texts():
        text.set_color(INK_SECONDARY)

    # ---------------- Panel B: rolling correlation --------------------------
    _style_axes(ax_b)
    roll = pd.DataFrame(index=df.index)
    roll["spx_vs_real_retail"] = df["sp500_yoy"].rolling(window, min_periods=window).corr(df["retail_yoy_real"])
    roll["spx_vs_gap"] = df["sp500_yoy"].rolling(window, min_periods=window).corr(df["inflation_retail_gap"])
    roll = roll.dropna(how="all")

    _shade_recessions(ax_b, spans)
    ax_b.axhline(0, color=ZERO_LINE, linewidth=1.1, zorder=1)
    ax_b.plot(roll.index, roll["spx_vs_real_retail"], color=C_RETAIL, linewidth=2.0, zorder=3,
              label="S&P 500 YoY  vs  real retail growth")
    ax_b.plot(roll.index, roll["spx_vs_gap"], color=C_INFLATION, linewidth=2.0, zorder=3,
              label="S&P 500 YoY  vs  inflation/retail gap")

    ax_b.set_ylim(-1.05, 1.05)
    ax_b.set_ylabel(f"{window}-month rolling correlation", color=INK_SECONDARY, fontsize=10.5, labelpad=8)
    ax_b.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:+.1f}"))
    ax_b.xaxis.set_major_locator(mdates.YearLocator(10))
    ax_b.xaxis.set_minor_locator(mdates.YearLocator(2))
    ax_b.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    if not roll.empty:
        ax_b.set_xlim(roll.index.min(), roll.index.max())
    ax_b.set_title(f"B.  {window}-month rolling correlation, with NBER recessions shaded",
                   loc="left", fontsize=12.5, fontweight="bold", color=INK_PRIMARY, pad=12)

    handles_b = [
        Line2D([], [], color=C_RETAIL, linewidth=2.4, label="S&P 500 YoY  vs  real retail growth"),
        Line2D([], [], color=C_INFLATION, linewidth=2.4, label="S&P 500 YoY  vs  inflation/retail gap"),
        Patch(facecolor=C_RECESSION, alpha=0.18, label="NBER recession"),
    ]
    # Both correlation lines traverse the full -1..+1 range, so there is no
    # in-panel corner an inset legend would not sit on top of. Park it beneath
    # the axes instead, level with panel A's x-axis label.
    leg_b = ax_b.legend(handles=handles_b, loc="upper left", bbox_to_anchor=(0.0, -0.06),
                        frameon=True, fontsize=9.5, borderpad=0.6, ncol=3, columnspacing=1.8,
                        framealpha=1.0)
    leg_b.get_frame().set_facecolor(SURFACE)
    leg_b.get_frame().set_edgecolor(GRID)
    for text in leg_b.get_texts():
        text.set_color(INK_SECONDARY)

    fig.suptitle("Does the stock market price in a squeezed consumer?",
                 x=0.045, ha="left", fontsize=17, fontweight="bold", color=INK_PRIMARY, y=0.98)
    fig.text(0.045, 0.017,
             "Sources: FRED (CPIAUCSL, RSAFS/RETAIL, USREC) · Yahoo Finance (S&P 500). "
             "Forward returns use month-end closes and are price-only (no dividends).",
             fontsize=8.5, color=INK_MUTED, ha="left")

    fig.subplots_adjust(left=0.055, right=0.985, top=0.855, bottom=0.185, wspace=0.20)
    fig.savefig(outpath, dpi=dpi, facecolor=SURFACE)
    plt.close(fig)
    log.info("Wrote %s", outpath)
    return outpath


# ---------------------------------------------------------------------------
# Excel export
# ---------------------------------------------------------------------------


def write_excel(path: Path, sheets: dict[str, pd.DataFrame]) -> Path:
    """Write every frame to one workbook, with a readme sheet up front."""
    with pd.ExcelWriter(path, engine="openpyxl", datetime_format="yyyy-mm-dd") as writer:
        for name, frame in sheets.items():
            if frame is None or frame.empty:
                log.warning("Sheet %-22s skipped (no rows)", name)
                continue
            index = isinstance(frame.index, pd.DatetimeIndex) or frame.index.name is not None
            frame.to_excel(writer, sheet_name=name[:31], index=index)

            # Widen columns so the workbook is readable without manual fiddling.
            worksheet = writer.sheets[name[:31]]
            offset = 2 if index else 1
            if index:
                worksheet.column_dimensions["A"].width = 13
            for i, column in enumerate(frame.columns):
                letter = worksheet.cell(row=1, column=i + offset).column_letter
                body = frame[column].astype(str)
                width = max(len(str(column)), int(body.str.len().quantile(0.95)) if len(body) else 0) + 3
                worksheet.column_dimensions[letter].width = min(max(width, 11), 70)
            worksheet.freeze_panes = "B2" if index else "A2"
    log.info("Wrote %s", path)
    return path


def build_readme(provenance: pd.DataFrame, splice_note: str, spx_source: str, window: int) -> pd.DataFrame:
    """Human-readable notes sheet -- what each column means and what not to do
    with it."""
    entries = [
        ("Generated (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")),
        ("S&P 500 source", spx_source),
        ("Retail sales construction", splice_note),
        ("Rolling correlation window", f"{window} months"),
        ("", ""),
        ("SHEET: monthly_merged", "Analysis frequency. One row per month, month-start stamped."),
        ("SHEET: daily_merged", "Business-day spine with monthly macro series forward-filled onto it."),
        ("SHEET: recession_episodes", "One row per NBER contraction with market and retail behaviour."),
        ("SHEET: lead_lag_corr", "S&P YoY correlated with real retail growth at lags of -24..+24 months."),
        ("SHEET: correlation_matrix", "Pearson correlations across the full sample."),
        ("SHEET: current_signals", "Latest reading on each recession indicator vs. its warning threshold."),
        ("", ""),
        ("COLUMN retail_nominal", "Retail and food services sales, millions of current USD, seasonally adjusted."),
        ("COLUMN retail_real", "retail_nominal deflated by CPI/100 -- constant 1982-84 dollars."),
        ("COLUMN retail_yoy_nominal", "12-month percent change in current-dollar retail sales."),
        ("COLUMN retail_yoy_real", "12-month percent change in deflated retail sales. The volume signal."),
        ("COLUMN retail_yoy_real_approx", "nominal YoY minus CPI YoY -- the common shortcut, biased at high inflation."),
        ("COLUMN cpi_yoy", "12-month percent change in CPI-U, all items, seasonally adjusted."),
        ("COLUMN inflation_retail_gap", "cpi_yoy minus retail_yoy_nominal. Positive = prices outrunning spending."),
        ("COLUMN sp500_close", "Month-end close of the S&P 500 index. Price only, dividends excluded."),
        ("COLUMN sp500_avg", "Mean of the month's daily closes."),
        ("COLUMN sp500_yoy", "12-month percent change in the month-end close."),
        ("COLUMN sp500_real", "sp500_close deflated by CPI/100 -- purchasing-power terms."),
        ("COLUMN sp500_fwd_12m", "Return over the FOLLOWING 12 months. Contains look-ahead information "
                                 "by design; valid for historical study, never as a model feature."),
        ("COLUMN recession", "USREC: 1 during an NBER-dated contraction, 0 otherwise."),
        ("", ""),
        ("CAVEAT Temporal basis", "CPI and retail sales are published with a 2-6 week lag and are revised; "
                                  "the S&P is real time. Same-month rows are not same-information rows."),
        ("CAVEAT NBER lag", "NBER dates recessions 6-18 months after the fact. USREC is a historical label, "
                            "not a real-time signal."),
        ("CAVEAT Retail splice", "Pre-1992 retail levels come from a discontinued SIC-basis series rescaled onto "
                                 "the NAICS basis. Growth rates are comparable; absolute levels are indicative."),
        ("CAVEAT Price-only index", "S&P figures exclude dividends, understating total return by roughly "
                                    "2-4pp a year in the earlier decades of the sample."),
        ("CAVEAT Thresholds", "The warning thresholds on the signals sheet are conventional rules of thumb, "
                              "not fitted parameters. Each has produced false positives."),
    ]
    notes = pd.DataFrame(entries, columns=["item", "detail"])
    if not provenance.empty:
        spacer = pd.DataFrame([{"item": "", "detail": ""}, {"item": "DATA PROVENANCE", "detail": ""}])
        prov = provenance.assign(
            item=lambda d: d["column"],
            detail=lambda d: d.apply(
                lambda r: f"{r['source']} [{r['series_id']}] · {r['observations']:,} obs · "
                          f"{r['first_observation']} -> {r['last_observation']}"
                          + (f" · {r['note']}" if r["note"] else ""),
                axis=1,
            ),
        )[["item", "detail"]]
        notes = pd.concat([notes, spacer, prov], ignore_index=True)
    return notes


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def run(args: argparse.Namespace) -> int:
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)
    provenance = Provenance()

    # ----- 1. Fetch --------------------------------------------------------
    log.info("Fetching source data ...")
    try:
        cpi = fetch_fred_series(FRED_SERIES["cpi"], args.start)
        retail_modern = fetch_fred_series(FRED_SERIES["retail_nominal_modern"], args.start)
        usrec = fetch_fred_series(FRED_SERIES["recession"], args.start)
    except DataFetchError as exc:
        log.error("Required FRED series unavailable: %s", exc)
        return 1

    provenance.add("cpi", "FRED", FRED_SERIES["cpi"], cpi, "CPI-U all items, SA, 1982-84=100")
    provenance.add("recession", "FRED", FRED_SERIES["recession"], usrec, "NBER recession indicator")

    # The legacy retail series is optional: without it the model simply starts
    # in 1992 instead of 1947.
    retail_legacy = pd.Series(dtype="float64")
    if not args.no_splice:
        try:
            retail_legacy = fetch_fred_series(FRED_SERIES["retail_nominal_legacy"], args.start)
        except DataFetchError as exc:
            log.warning("Legacy retail series unavailable, history starts 1992: %s", exc)

    retail, splice_note = splice_retail_series(retail_modern, retail_legacy)
    provenance.add("retail_nominal", "FRED",
                   f"{FRED_SERIES['retail_nominal_modern']}+{FRED_SERIES['retail_nominal_legacy']}"
                   if not retail_legacy.empty else FRED_SERIES["retail_nominal_modern"],
                   retail, splice_note)

    try:
        spx, spx_source, spx_ticker = fetch_sp500()
    except DataFetchError as exc:
        log.error("S&P 500 unavailable from every source:\n%s", exc)
        return 1
    provenance.add("sp500", spx_source, spx_ticker, spx, "daily close, price index (no dividends)")

    # ----- 2. Align --------------------------------------------------------
    log.info("Aligning series ...")
    monthly_levels = {
        "cpi": to_month_start(cpi),
        "retail_nominal": to_month_start(retail),
        "recession": to_month_start(usrec),
    }
    daily = build_daily_frame(spx, monthly_levels)
    monthly = build_monthly_frame(spx, monthly_levels)

    # ----- 3. Derive -------------------------------------------------------
    log.info("Computing nominal, real and market metrics ...")
    monthly = add_derived_metrics(monthly)

    # Mirror the headline derived rates back onto the daily frame so the Excel
    # daily sheet is usable on its own. The macro rates are monthly step
    # functions, so they forward-fill; the S&P YoY is recomputed on the daily
    # grid at a true 252-trading-day offset.
    for col in ("retail_yoy_real", "retail_yoy_nominal", "cpi_yoy", "inflation_retail_gap"):
        daily[col] = monthly[col].reindex(daily.index).ffill()
    daily["sp500_yoy"] = daily["sp500"].pct_change(252) * 100.0
    daily["recession"] = daily["recession"].fillna(0).astype(int)

    spans = recession_periods(monthly["recession"])
    log.info("Identified %d NBER recessions in the sample window", len(spans))

    episodes = recession_table(monthly, spans, spx)
    leadlag = lead_lag_correlation(monthly)
    corr = correlation_matrix(monthly)
    signals = current_signals(monthly)

    # ----- 4. Charts -------------------------------------------------------
    log.info("Rendering charts ...")
    chart1 = chart1_timeseries(monthly, spans, outdir / "chart1_macro_timeseries.png", args.dpi)
    chart2 = chart2_correlation(monthly, spans, outdir / "chart2_correlation.png", args.dpi, args.rolling_window)

    # ----- 5. Excel --------------------------------------------------------
    log.info("Writing workbook ...")
    monthly_out = monthly.round(4)
    monthly_out.index = monthly_out.index.date
    monthly_out.index.name = "date"
    daily_out = daily.round(4)
    daily_out.index = daily_out.index.date
    daily_out.index.name = "date"

    xlsx = write_excel(
        outdir / "macro_trend_analysis.xlsx",
        {
            "readme": build_readme(provenance.to_frame(), splice_note, spx_source, args.rolling_window),
            "monthly_merged": monthly_out,
            "daily_merged": daily_out,
            "recession_episodes": episodes,
            "lead_lag_corr": leadlag,
            "correlation_matrix": corr.reset_index().rename(columns={"index": "metric"}),
            "current_signals": signals,
        },
    )

    # ----- 6. Console summary ---------------------------------------------
    _print_summary(monthly, episodes, leadlag, signals, spans, [xlsx, chart1, chart2])
    return 0


def _print_summary(monthly, episodes, leadlag, signals, spans, artifacts) -> None:
    line = "=" * 78
    print(f"\n{line}\nMACRO RECESSION MODEL\n{line}")
    print(f"Sample window     : {monthly.index.min():%b %Y} – {monthly.index.max():%b %Y} "
          f"({len(monthly):,} months)")
    print(f"NBER recessions   : {len(spans)}")

    if not leadlag.empty:
        # Restrict to non-negative leads: we care how far the market leads the
        # consumer, not how far it trails.
        forward = leadlag[leadlag["lead_months"] >= 0].dropna(subset=["corr_spx_vs_real_retail"])
        if not forward.empty:
            best = forward.loc[forward["corr_spx_vs_real_retail"].idxmax()]
            print(f"Market lead       : S&P 500 YoY correlates most strongly with real retail growth "
                  f"{int(best['lead_months'])} months later (r = {best['corr_spx_vs_real_retail']:+.2f})")

    if not episodes.empty:
        lead = pd.to_numeric(episodes["sp500_peak_lead_months"], errors="coerce").dropna()
        drawdown = pd.to_numeric(episodes["sp500_drawdown_pct"], errors="coerce").dropna()
        trough = pd.to_numeric(episodes["min_real_retail_yoy_pct"], errors="coerce").dropna()
        if not lead.empty:
            print(f"Typical S&P peak  : {lead.median():.1f} months before the NBER-dated business cycle peak (median)")
        if not drawdown.empty:
            print(f"Typical drawdown  : {drawdown.median():.1f}% peak-to-trough during the contraction (median)")
        if not trough.empty:
            print(f"Real retail trough: {trough.median():.1f}% YoY at the worst point (median)")

    print(f"\nCurrent signals (as of {signals['as_of'].iloc[0]}):")
    for _, row in signals.iterrows():
        mark = "TRIGGERED" if row["triggered"] else "   ok    "
        value = f"{row['value']:>8.2f}" if isinstance(row["value"], (int, float, np.floating)) else f"{row['value']:>8}"
        print(f"  [{mark}] {row['indicator']:<52} {value}   (warn {row['warning_threshold']})")

    fired = int(signals["triggered"].sum())
    print(f"\n  {fired} of {len(signals)} indicators triggered. These are directional rules of thumb, "
          f"not a forecast;\n  every one of them has fired outside a recession at some point.")

    print("\nArtifacts:")
    for path in artifacts:
        print(f"  {path}")
    print(line)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch, align, analyse and chart US retail sales, inflation and the S&P 500 "
                    "against NBER recessions.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--outdir", default=".", help="Directory for the workbook and PNG charts")
    parser.add_argument("--start", default=EARLIEST_START,
                        help="Earliest date requested from the APIs (providers return their full history from here)")
    parser.add_argument("--rolling-window", type=int, default=DEFAULT_ROLLING_WINDOW,
                        help="Rolling correlation window, in months")
    parser.add_argument("--dpi", type=int, default=200, help="Output resolution for the PNG charts")
    parser.add_argument("--no-splice", action="store_true",
                        help="Skip the pre-1992 legacy retail splice; use RSAFS only")
    parser.add_argument("-v", "--verbose", action="store_true", help="Debug-level logging")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s  %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    try:
        return run(args)
    except KeyboardInterrupt:
        log.warning("Interrupted")
        return 130
    except DataFetchError as exc:
        log.error("%s", exc)
        return 1
    except Exception:  # noqa: BLE001
        log.exception("Unhandled failure")
        return 1


if __name__ == "__main__":
    sys.exit(main())
