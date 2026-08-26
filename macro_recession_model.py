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

#: The series the model is actually about. Only these determine how far back
#: the frame reaches -- comparison indicators join it, they do not extend it.
CORE_LEVEL_COLUMNS = ("sp500_close", "cpi", "retail_nominal")

#: Comparison indicators, fetched best-effort. These exist so the model can
#: score its own retail/inflation signals against the recession indicators the
#: literature actually rates, rather than asserting skill it has not measured.
#: Each maps to (FRED id, monthly aggregation). A failure here degrades the
#: skill table but never stops the run.
FRED_INDICATORS = {
    "ust_10y": ("GS10", "mean"),        # 10-year Treasury, monthly, 1953->
    "ust_3m": ("TB3MS", "mean"),        # 3-month bill, monthly, 1934->
    "baa": ("BAA", "mean"),             # Moody's Baa corporate yield, 1919->
    "permits": ("PERMIT", "mean"),      # building permits, monthly, 1960->
    "claims": ("ICSA", "mean"),         # initial jobless claims, weekly, 1967->
    "sahm": ("SAHMREALTIME", "last"),   # real-time Sahm rule, monthly, 1959->
    # --- Monetary policy / central bank ---
    "fed_funds": ("FEDFUNDS", "mean"),  # effective fed funds rate, 1954->
    "nfci": ("NFCI", "mean"),           # Chicago Fed financial conditions, weekly, 1971->
    "m2_real": ("M2REAL", "mean"),      # real M2 money stock, 1959->
    "fed_assets": ("WALCL", "mean"),    # Fed total assets (QE/QT), weekly, 2002->
    "lending_standards": ("DRTSCILM", "mean"),  # SLOOS: net % of banks tightening C&I, 1990->
    "continued_claims": ("CCSA", "mean"),       # continued jobless claims, weekly, 1967->
    # --- The series NBER's dating committee actually cites ---
    # The model previously contained only one of these five (retail sales), so
    # it was predicting a label defined largely on data it did not hold.
    "mfg_trade_sales": ("CMRMTSPL", "mean"),    # real manufacturing + trade sales, 1967->
    "income_ex_transfers": ("W875RX1", "mean"), # real personal income less transfers, 1959->
    "payrolls": ("PAYEMS", "mean"),             # all employees, total nonfarm, 1939->
    "indpro": ("INDPRO", "mean"),               # industrial production, 1919->
    # PCECC96 is the LEVEL (quarterly, 1947->). DPCERAM1M225NBEA looks like a
    # tempting monthly alternative but is a percent-change series, so growth
    # rates computed from it are meaningless.
    "real_pce": ("PCECC96", "mean"),            # real personal consumption expenditures, 1947->
    # --- Fiscal ---
    "fed_receipts": ("FGRECPT", "mean"),        # federal current receipts, quarterly, 1947->
    "fed_outlays": ("FGEXPND", "mean"),         # federal current expenditures, quarterly, 1947->
    "nominal_gdp": ("GDP", "mean"),             # nominal GDP, quarterly, 1947->
    "govt_spending": ("GCEC1", "mean"),         # real govt consumption + investment, quarterly, 1947->
    # --- Household balance sheet ---
    "saving_rate": ("PSAVERT", "mean"),         # personal saving rate, 1959->
    "unemployment": ("UNRATE", "mean"),         # unemployment rate, 1948->
    "household_debt": ("CMDEBT", "mean"),       # household debt level, quarterly, 1945->
    "net_worth_dpi": ("HNONWPDPI", "mean"),     # household net worth % of disposable income, 1946->
    "loan_delinquency": ("DRALACBS", "mean"),   # delinquency rate, all bank loans, 1985->
    # --- International ---
    "de_10y": ("IRLTLT01DEM156N", "mean"),      # German 10-year govt bond yield, 1956->
    "de_3m": ("IR3TIB01DEM156N", "mean"),       # German 3-month interbank rate, 1960->
    "uk_recession": ("GBRRECDM", "mean"),       # UK recession indicator (discontinued 2022)
    "oecd_recession": ("OECDRECDM", "mean"),    # OECD-wide recession indicator (discontinued 2022)
    "ecb_assets": ("ECBASSETSW", "mean"),       # ECB total assets, 1999->
    "boj_assets": ("JPNASSETS", "mean"),        # Bank of Japan total assets, 1998->
    "china_exports": ("XTEXVA01CNM667S", "mean"),  # China exports, value, 1992->
    "copper": ("PCOPPUSDM", "mean"),            # copper price, a China-demand proxy, 1992->
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

#: Start of the "modern" era used for the era-split columns in the skill
#: table. 1985 marks the onset of the Great Moderation: recessions become far
#: rarer after it, which changes what any signal's firing is worth. The split
#: is reported rather than applied -- both halves ship side by side.
MODERN_ERA_START = "1985-01-01"

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

    # yfinance logs its own multi-line ERROR blocks on a failed download. We
    # treat that failure as recoverable and fall through to the next source, so
    # letting its logger shout would put ERROR lines in front of the user for a
    # path the script handles cleanly. Quiet it for the duration of the attempt.
    yf_log = logging.getLogger("yfinance")
    prior_level, prior_disabled = yf_log.level, yf_log.disabled
    yf_log.setLevel(logging.CRITICAL)
    yf_log.disabled = True
    try:
        return _yfinance_attempts(yf)
    finally:
        yf_log.setLevel(prior_level)
        yf_log.disabled = prior_disabled


def _yfinance_attempts(yf):
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


#: The 50 state unemployment-rate series, used by the optional diffusion
#: index. FRED ids are the two-letter postal code plus "UR".
STATE_CODES = (
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO "
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
).split()


def fetch_state_diffusion(start: str = EARLIEST_START) -> pd.Series:
    """Share of states whose unemployment rate is rising off its own recent low.

    Every other indicator in this model is a national aggregate. This one is a
    *breadth* measure: it asks how widely weakness has spread rather than how
    deep it is nationally, which is information no aggregate contains. It is a
    state-level Sahm rule -- for each state, is unemployment at least 0.5pp
    above its trailing 12-month minimum -- averaged across the states.

    Measured result: it does not earn its keep. It scores 1.60x (skill 0.091,
    5 of 14 episodes) against the yield curve's 3.99x on the same 1976-onward
    sample. It stays behind a flag because it costs fifty extra API
    calls for a signal the curve dominates, but it is here because a negative
    result worth knowing is still worth being able to reproduce.
    """
    frames: dict[str, pd.Series] = {}
    failed = []
    for code in STATE_CODES:
        try:
            frames[code] = fetch_fred_series(f"{code}UR", start)
        except DataFetchError:
            failed.append(code)
    if len(frames) < 40:
        raise DataFetchError(
            f"only {len(frames)}/50 state unemployment series retrieved; diffusion index unreliable"
        )
    if failed:
        log.warning("State diffusion: %d states unavailable (%s)", len(failed), ", ".join(failed))

    panel = pd.DataFrame(frames).sort_index()
    above_low = panel - panel.rolling(12, min_periods=12).min()
    diffusion = (above_low >= 0.5).sum(axis=1) / panel.notna().sum(axis=1) * 100.0
    return diffusion.dropna()


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
    # Trim on the model's own series only. Two traps here, both hit in
    # development: `sp500_trading_days` is zero-filled rather than NaN-filled,
    # so including it makes every row look populated; and a comparison
    # indicator that happens to start earlier than the model's data (BAA runs
    # from 1919, nine years before the S&P) would otherwise drag the frame back
    # and pad it with rows carrying nothing but that one series.
    core = [c for c in CORE_LEVEL_COLUMNS if c in monthly.columns]
    first = monthly.index[monthly[core].notna().any(axis=1)]
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

    # Drawdown from the trailing 12-month high. Included to test the common
    # intuition that a falling market warns of recession -- it does not, and
    # the deeper the fall the worse it warns. See the signal note below.
    df["sp500_drawdown_12m"] = (
        df["sp500_close"] / df["sp500_close"].rolling(12, min_periods=12).max() - 1.0
    ) * 100.0

    # --- Comparison leading indicators -------------------------------------
    # These are not part of the retail/inflation thesis. They are here as a
    # yardstick: without them there is no way to tell whether a retail signal
    # that "looks like" it precedes recessions carries any information a
    # well-known indicator does not already carry, or indeed any at all.
    if {"ust_10y", "ust_3m"} <= set(df.columns):
        # Term spread. Inversion (short rates above long) is the single
        # best-documented leading indicator of US recessions.
        df["yield_curve"] = df["ust_10y"] - df["ust_3m"]
    if {"baa", "ust_10y"} <= set(df.columns):
        # Baa-over-Treasury credit spread. FRED publishes this ready-made as
        # BAA10Y, but only from 1986 -- four recessions, too few to score a
        # signal on. Building it from the component yields instead reaches back
        # to 1953 and eleven recessions.
        df["credit_spread"] = df["baa"] - df["ust_10y"]
        # The 12-month *change*, not the level, is the signal. Spread levels are
        # regime-dependent and stay wide right through a recovery, so a level
        # threshold scores 0.35x -- it captures the aftermath of the last
        # recession rather than the approach of the next one. Widening is the
        # part that carries information.
        df["credit_spread_chg12"] = df["credit_spread"].diff(12)
    if "permits" in df.columns:
        # Residential building permits: housing turns before the wider economy.
        df["permits_yoy"] = df["permits"].pct_change(12) * 100.0
    if "claims" in df.columns:
        # Initial jobless claims, YoY. Rising claims lead payroll losses.
        df["claims_yoy"] = df["claims"].pct_change(12) * 100.0
        # Short-horizon change, for the "direction" feature set: a level says
        # how bad things are, a three-month change says which way they are
        # moving. Only the second can distinguish a recovery from an approach.
        df["claims_chg3"] = df["claims"].pct_change(3) * 100.0
    if "nfci" in df.columns:
        df["nfci_chg3"] = df["nfci"].diff(3)

    # --- NBER dating criteria ---------------------------------------------
    # These are what the committee weighs when it dates a cycle. They belong in
    # the model as COINCIDENT measures: they describe the recession, they do not
    # forecast it. Including them is what lets the model speak the same language
    # as the label it is scored against.
    for raw, derived in (
        ("mfg_trade_sales", "mfg_trade_sales_yoy"),
        ("income_ex_transfers", "income_ex_transfers_yoy"),
        ("payrolls", "payrolls_yoy"),
        ("indpro", "indpro_yoy"),
        ("real_pce", "real_pce_yoy"),
    ):
        if raw in df.columns:
            df[derived] = df[raw].pct_change(12) * 100.0

    # --- Household balance sheet -------------------------------------------
    # Households turn out to behave like the policy variables: their stress
    # shows up as a consequence of the downturn, not ahead of it. Delinquencies
    # are the clearest case -- people default because they lost the job, which
    # is why the series is strongly coincident and anti-predictive.
    if "household_debt" in df.columns:
        df["household_debt_yoy"] = df["household_debt"].pct_change(12) * 100.0
    if "net_worth_dpi" in df.columns:
        df["net_worth_dpi_yoy"] = df["net_worth_dpi"].pct_change(12) * 100.0
    if "loan_delinquency" in df.columns:
        df["loan_delinquency_chg12"] = df["loan_delinquency"].diff(12)

    # --- International ------------------------------------------------------
    # The German term spread is the most valuable non-US series tested. It is
    # NOT redundant with the US curve (they co-fire at phi +0.36) and it scores
    # 3.38x in precisely the months when the US curve is not inverted, so it
    # catches episodes the domestic signal misses.
    if {"de_10y", "de_3m"} <= set(df.columns):
        df["german_yield_curve"] = df["de_10y"] - df["de_3m"]
    if "china_exports" in df.columns:
        df["china_exports_yoy"] = df["china_exports"].pct_change(12) * 100.0
    if "copper" in df.columns:
        df["copper_yoy"] = df["copper"].pct_change(12) * 100.0
    if "ecb_assets" in df.columns:
        df["ecb_assets_yoy"] = df["ecb_assets"].pct_change(12) * 100.0
    if "boj_assets" in df.columns:
        df["boj_assets_yoy"] = df["boj_assets"].pct_change(12) * 100.0

    # --- Fiscal stance ------------------------------------------------------
    # Fiscal variables are the clearest case of endogeneity in this model.
    # Automatic stabilisers widen the deficit BECAUSE a recession is happening:
    # tax receipts collapse and transfer payments rise without anyone deciding
    # anything. So a widening deficit is a symptom, and treating it as a
    # forecast inverts cause and effect. Measured here: the first month of
    # >1pp-of-GDP widening arrives a median ONE MONTH AFTER the recession
    # begins, and precedes it in only 3 of 12 recessions.
    if {"fed_receipts", "fed_outlays", "nominal_gdp"} <= set(df.columns):
        df["federal_balance_pct_gdp"] = (
            (df["fed_receipts"] - df["fed_outlays"]) / df["nominal_gdp"] * 100.0
        )
        # Four-quarter change in the balance. Negative = the deficit widened =
        # fiscal expansion; positive = consolidation.
        df["fiscal_impulse_4q"] = df["federal_balance_pct_gdp"].diff(12)
    if "govt_spending" in df.columns:
        df["govt_spending_yoy"] = df["govt_spending"].pct_change(12) * 100.0

    # --- Monetary policy stance ------------------------------------------
    if "fed_funds" in df.columns:
        # How hard the Fed has tightened over the past year. This is the
        # mechanism behind the yield curve rather than a rival to it: the curve
        # inverts largely because the Fed pushes the short end up.
        df["fed_funds_chg12"] = df["fed_funds"].diff(12)
        # Policy stance in real terms. A 5% policy rate is loose at 8%
        # inflation and punishing at 1%, so the nominal rate alone says little.
        df["real_fed_funds"] = df["fed_funds"] - df["cpi_yoy"]
    if "m2_real" in df.columns:
        df["m2_real_yoy"] = df["m2_real"].pct_change(12) * 100.0
    if "fed_assets" in df.columns:
        # Balance sheet growth: QE positive, QT negative. Read the caveat on
        # the signal before drawing any conclusion from this one.
        df["fed_assets_yoy"] = df["fed_assets"].pct_change(12) * 100.0

    if "continued_claims" in df.columns:
        # Continued claims measure people who stay unemployed, not just those
        # newly filing. It is the weakest-looking of the labour signals until
        # recovery months are excluded, at which point it is among the
        # strongest -- claims stay elevated long after a recession ends, and
        # that tail is what drags its raw score down.
        df["continued_claims_yoy"] = df["continued_claims"].pct_change(12) * 100.0

    if "yield_curve" in df.columns:
        # The curve *un-inverting*. Conventional attention goes to the
        # inversion, but the steepening that follows is often the more
        # proximate warning: it happens as the Fed starts cutting, which it
        # does when the downturn is already arriving. Scored separately below.
        inverted = df["yield_curve"] < 0
        recently = inverted.rolling(12, min_periods=1).max().astype(bool)
        df["curve_uninverting"] = ((~inverted) & recently).astype(float).where(df["yield_curve"].notna())

    # Composite policy-tightening score, 0-3. The three components are only
    # loosely related to each other -- the curve and financial conditions
    # co-fire at phi = +0.16, close to independent -- so agreement between them
    # is meaningful rather than the same fact counted three times.
    if {"yield_curve", "fed_funds_chg12", "nfci"} <= set(df.columns):
        parts = [df["yield_curve"] < 0, df["fed_funds_chg12"] > 2.0, df["nfci"] > 0]
        available = df[["yield_curve", "fed_funds_chg12", "nfci"]].notna().all(axis=1)
        df["policy_tightening_score"] = (
            sum(part.astype(float) for part in parts).where(available)
        )

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


# ---------------------------------------------------------------------------
# Signal registry and skill testing
# ---------------------------------------------------------------------------

#: Every indicator the model reports on, with the condition that "fires" it and
#: how it should be read. The `kind` field is the honest part: a COINCIDENT
#: indicator tells you what is happening now, a LEADING one claims to tell you
#: what happens next, and only the latter is entitled to a forecasting claim.
#: Conflating the two is the specific error this registry exists to prevent --
#: real retail contraction is an excellent coincident marker and a useless
#: leading one, and a dashboard that lists it under "warning threshold" without
#: saying which invites the reader to act on it as a forecast.
SIGNAL_DEFS: list[dict] = [
    {
        "name": "Yield curve inverted (10y - 3m)",
        "short": "Yield curve inverted",
        "column": "yield_curve",
        "kind": "leading",
        "condition": "< 0",
        "fires": lambda v: v < 0,
        "note": "Short rates above long. The best-documented leading indicator of US recessions.",
    },
    {
        "name": "Credit spread widening (Baa - 10y)",
        "short": "Credit spread widening",
        "column": "credit_spread_chg12",
        "kind": "leading",
        "condition": "> +0.5 pp in 12m",
        "fires": lambda v: v > 0.5,
        "note": "Corporate borrowing stress widening. Built from BAA minus GS10 (1953 on) rather "
                "than the ready-made BAA10Y, which starts in 1986 and covers only four "
                "recessions. The level scores 0.35x -- spreads stay wide through recoveries -- "
                "so the 12-month change is used instead. Even so it is only marginally "
                "informative here.",
    },
    {
        "name": "Building permits YoY",
        "short": "Building permits YoY",
        "column": "permits_yoy",
        "kind": "leading",
        "condition": "< -10%",
        "fires": lambda v: v < -10.0,
        "note": "Housing starts turn before the wider economy; permits turn before starts.",
    },
    {
        "name": "Initial jobless claims YoY",
        "short": "Jobless claims YoY",
        "column": "claims_yoy",
        "kind": "leading",
        "condition": "> +10%",
        "fires": lambda v: v > 10.0,
        "note": "Rising claims lead outright payroll losses by a few months.",
    },
    {
        "name": "Sahm rule (real-time)",
        "short": "Sahm rule",
        "column": "sahm",
        "kind": "leading",
        "condition": ">= 0.50",
        "fires": lambda v: v >= 0.50,
        "note": "Unemployment rate rising off its recent low. Designed as a fast trigger, so it "
                "fires near the start of a downturn rather than ahead of one.",
    },
    {
        "name": "Policy tightening score (2 of 3)",
        "short": "Policy tightening 2/3",
        "column": "policy_tightening_score",
        "kind": "leading",
        "condition": ">= 2 of 3",
        "fires": lambda v: v >= 2,
        "note": "Agreement between the yield curve, a Fed tightening cycle and tight financial "
                "conditions. Fires across only six distinct episodes since 1971 -- three followed "
                "by recessions (1973, 1978-80, 1980-81) and three not (1984, 1989, 2022-23) -- so "
                "the month-count lift overstates how much evidence there is. The 1989 miss is "
                "partly an artifact of the 12-month horizon: that recession began in month 14.",
    },
    {
        "name": "Fed funds 12m change",
        "short": "Fed tightening cycle",
        "column": "fed_funds_chg12",
        "kind": "leading",
        "condition": "> +2.0 pp",
        "fires": lambda v: v > 2.0,
        "note": "The Fed raising hard. Related to the yield curve by construction, but not "
                "redundant with it: restricted to months when the curve is NOT inverted it still "
                "scores 2.25x, so it catches tightening episodes the curve misses.",
    },
    {
        "name": "Financial conditions tight (NFCI)",
        "short": "Financial conditions",
        "column": "nfci",
        "kind": "leading",
        "condition": "> 0",
        "fires": lambda v: v > 0,
        "note": "Chicago Fed index of credit, leverage and risk conditions; positive means tighter "
                "than average. Nearly independent of the yield curve (phi +0.16), which makes it "
                "the most useful complement to it in this table -- when both fire together, "
                "precision reaches 93% on 29 months.",
    },
    {
        "name": "Real fed funds rate",
        "short": "Real policy rate",
        "column": "real_fed_funds",
        "kind": "leading",
        "condition": "> +3%",
        "fires": lambda v: v > 3.0,
        "note": "Policy rate minus CPI inflation. Restrictive policy in real terms, which is the "
                "form that actually bites.",
    },
    {
        "name": "Real M2 money supply YoY",
        "short": "Real M2 YoY",
        "column": "m2_real_yoy",
        "kind": "leading",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "Inflation-adjusted money stock shrinking.",
    },
    {
        "name": "Fed balance sheet YoY (QT)",
        "short": "Fed balance sheet (QT)",
        "column": "fed_assets_yoy",
        "kind": "leading",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "Quantitative tightening. Included because it is the intervention people most "
                "expect to matter and it does not: lift ~1.0x on a sample covering three "
                "recessions. Note also that the raw correlation between balance sheet growth and "
                "the S&P is NEGATIVE (-0.42), which is endogeneity, not evidence QE hurts stocks "
                "-- the Fed expands the balance sheet precisely when markets are falling.",
    },
    {
        "name": "State unemployment diffusion",
        "short": "State diffusion",
        "column": "state_diffusion",
        "kind": "leading",
        "condition": ">= 20% of states",
        "fires": lambda v: v >= 20.0,
        "note": "Breadth rather than depth: the share of states with unemployment rising off its own "
                "12-month low. Only present with --state-diffusion. Included as a documented "
                "negative -- 1.60x against the yield curve's 3.99x on the same 1976+ sample -- "
                "because knowing a plausible idea does not work is worth as much as another that does.",
    },
    {
        "name": "Curve un-inverting after inversion",
        "short": "Curve un-inverting",
        "column": "curve_uninverting",
        "kind": "leading",
        "condition": "= 1",
        "fires": lambda v: v > 0.5,
        "note": "The steepening that follows an inversion, rather than the inversion itself. Scores "
                "2.50x (2.83x ex-recovery, 5 of 9 episodes) on the full 1953 sample -- close to the "
                "inversion's own ex-recovery figure. The Fed cuts as the downturn arrives, so the "
                "un-inversion sits nearer the event than the inversion does.",
    },
    {
        "name": "Banks tightening lending standards",
        "short": "Bank lending standards",
        "column": "lending_standards",
        "kind": "leading",
        "condition": "> 20% net",
        "fires": lambda v: v > 20.0,
        "note": "Senior Loan Officer Survey: net share of banks tightening commercial and industrial "
                "credit. Arguably the transmission channel from policy to the real economy. Strong "
                "on lift but thin on evidence -- the survey starts in 1990, is quarterly, and fires "
                "in only a handful of distinct episodes, so weigh the episode ratio heavily here.",
    },
    {
        "name": "Continued jobless claims YoY",
        "short": "Continued claims YoY",
        "column": "continued_claims_yoy",
        "kind": "leading",
        "condition": "> +10%",
        "fires": lambda v: v > 10.0,
        "note": "People staying unemployed rather than newly filing. Its raw lift understates it: "
                "claims stay high through recoveries, and excluding those months roughly doubles "
                "its measured skill.",
    },
    {
        "name": "German yield curve inverted",
        "short": "German yield curve",
        "column": "german_yield_curve",
        "kind": "leading",
        "condition": "< 0",
        "fires": lambda v: v < 0,
        "note": "The best non-US signal tested, and genuinely additive rather than an echo of the "
                "domestic curve: the two co-fire at only phi +0.36, and restricted to months when "
                "the US curve is NOT inverted the German one still scores 3.38x. Standalone 2.80x "
                "on 8 of 10 episodes back to 1960. Global monetary conditions bind US activity "
                "through channels the US curve alone does not price.",
    },
    {
        "name": "Copper price falling",
        "short": "Copper price",
        "column": "copper_yoy",
        "kind": "coincident",
        "condition": "< -20% YoY",
        "fires": lambda v: v < -20.0,
        "note": "'Dr. Copper' is not a leading indicator. At the -20% threshold it scores 4.57x "
                "coincident and 0.00x leading on 0 of 8 episodes; at -10%, 2.16x and 0.21x. Copper "
                "falls WITH the downturn, not ahead of it -- the same shape as the S&P drawdown "
                "result. Shipped as a documented negative because it is among the most widely cited "
                "global-growth signals.",
    },
    {
        "name": "China exports falling",
        "short": "China exports YoY",
        "column": "china_exports_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "The direct read on Chinese demand, and a clean null: 0.99x leading, which is "
                "exactly no information, on 2 of 13 episodes. Nothing in the China block scored -- "
                "China imports 0.99x, China CPI deflation 0.18x, the yuan 0.98x, and a Chinese "
                "recession 1.12x against the UK's 2.14x despite China being far the larger economy. "
                "Two caveats bound all of it: every China series starts in the 1990s and so covers "
                "only three US recessions, and China only became macro-significant to the US after "
                "2001. This is weak evidence of absence, not proof.",
    },
    {
        "name": "UK recession under way",
        "short": "UK recession",
        "column": "uk_recession",
        "kind": "leading",
        "condition": "= 1",
        "fires": lambda v: v > 0.5,
        "note": "A recession abroad genuinely leads one at home: 2.01x on 9 of 19 episodes since "
                "1955. Euro-area (0.74x) and Japanese (0.81x) recessions do not, so this is not a "
                "general 'foreign weakness' effect. DISCONTINUED in 2022 -- it can no longer produce "
                "a current reading, and the staleness column will say so.",
    },
    {
        "name": "OECD-wide recession under way",
        "short": "OECD recession",
        "column": "oecd_recession",
        "kind": "leading",
        "condition": "= 1",
        "fires": lambda v: v > 0.5,
        "note": "Broad synchronised weakness across the OECD, 1.63x on 8 of 20 episodes. Also "
                "DISCONTINUED in 2022.",
    },
    {
        "name": "ECB balance sheet shrinking",
        "short": "ECB balance sheet",
        "column": "ecb_assets_yoy",
        "kind": "leading",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "Non-US quantitative tightening, and a documented null exactly like the Fed's own: "
                "0.17x on 1 of 6 episodes since 2000. Central bank balance sheets contract when "
                "conditions are calm and expand into crises, so the sign is endogenous wherever you "
                "measure it.",
    },
    {
        "name": "Bank of Japan balance sheet shrinking",
        "short": "BoJ balance sheet",
        "column": "boj_assets_yoy",
        "kind": "leading",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "1.64x, but on 2 of 8 episodes and only since 1999 -- two US recessions in the "
                "sample. Treat as a curiosity rather than a signal; it is here because non-US "
                "central bank activity was worth checking, and this is the only part of it that "
                "was not flatly null.",
    },
    {
        "name": "Household debt growth",
        "short": "Household debt YoY",
        "column": "household_debt_yoy",
        "kind": "context",
        "condition": "> +8%",
        "fires": lambda v: v > 8.0,
        "note": "A necessary-but-not-sufficient pattern, and the clearest example of why lift and "
                "episode count must be read together: it precedes 11 of 14 firing episodes yet "
                "scores only 1.36x, and its coincident ratio is 0.90x -- it fires in 56.8% of "
                "expansion months. Rapid household borrowing was simply the post-war norm. Most "
                "recessions followed a credit boom; most credit booms produced no recession.",
    },
    {
        "name": "Household net worth falling",
        "short": "Net worth vs income",
        "column": "net_worth_dpi_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "Net worth relative to disposable income. Coincident (1.84x) and anti-predictive "
                "(0.65x) -- it falls because asset prices fall, which is the recession rather than "
                "a warning of it.",
    },
    {
        "name": "Loan delinquencies rising",
        "short": "Loan delinquencies",
        "column": "loan_delinquency_chg12",
        "kind": "coincident",
        "condition": "> +0.3pp in 12m",
        "fires": lambda v: v > 0.3,
        "note": "The strongest coincident household measure by a distance: it fires in 94.4% of "
                "recession months against 9.7% of expansion months, a 9.70x odds ratio. Its 2.78x "
                "leading lift (4.34x ex-recovery, 3 of 7 episodes) is better than the household "
                "story would suggest, but rests on a 1986-onward sample covering four recessions, "
                "and on a quarterly series carried across months. Read the episode count, not the "
                "lift. Note also that scoring this on the sparse quarterly points rather than the "
                "filled monthly grid gives 0.77x -- a swing large enough that the construction, not "
                "the data, is doing much of the work here.",
    },
    {
        "name": "Personal saving rate low",
        "short": "Saving rate",
        "column": "saving_rate",
        "kind": "context",
        "condition": "< 5%",
        "fires": lambda v: v < 5.0,
        "note": "Households running thin buffers, 1.41x on 2 of 10 episodes. The weakest kind of "
                "evidence in this table: a modest lift resting on very few distinct events.",
    },
    {
        "name": "Federal deficit widening",
        "short": "Deficit widening",
        "column": "fiscal_impulse_4q",
        "kind": "coincident",
        "condition": "> 2pp of GDP in 4q",
        "fires": lambda v: v < -2.0,
        "note": "Strongly coincident (5.48x odds) and anti-predictive (0.17x, 1 of 12 episodes), "
                "because automatic stabilisers widen the deficit as a CONSEQUENCE of the downturn. "
                "The timing is explicit: >1pp widening first appears a median one month AFTER the "
                "recession starts and leads it in only 3 of 12 cases. Useful for confirming where "
                "you are, useless for anticipating where you are going, and a standing warning "
                "against reading a fiscal response as a fiscal signal.",
    },
    {
        "name": "Real government spending YoY",
        "short": "Govt spending YoY",
        "column": "govt_spending_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "A documented null. Real government consumption and investment falling scores 0.53x "
                "leading and 0.68x coincident -- it carries no information in either direction. "
                "Fiscal austerity as a recession trigger does not show up: deficit consolidation of "
                "more than 1pp of GDP scores 0.78x. Whatever fiscal policy does to the cycle, it is "
                "not visible in these aggregates at this frequency.",
    },
    {
        "name": "Real manufacturing & trade sales YoY",
        "short": "Mfg + trade sales YoY",
        "column": "mfg_trade_sales_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "An NBER dating criterion, and a strictly better version of this model's original "
                "retail measure: it covers manufacturing and wholesale as well as retail, and beats "
                "real retail sales on both counts -- 8.15x coincident odds against 4.86x, and 2.18x "
                "leading lift against 1.52x.",
    },
    {
        "name": "Real personal income ex-transfers YoY",
        "short": "Real income ex-transfers",
        "column": "income_ex_transfers_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "An NBER dating criterion. Excluding transfers matters: government support payments "
                "prop up headline income precisely during downturns, which is why the 2020-21 "
                "episode looks so different on the two measures. Strongly coincident (6.30x) and "
                "useless as a forecast (0.28x), which is exactly what a dating criterion should be.",
    },
    {
        "name": "Nonfarm payrolls YoY",
        "short": "Nonfarm payrolls YoY",
        "column": "payrolls_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "An NBER dating criterion, and arguably the one that decides modern calls -- 2022 had "
                "falling GDP and booming payrolls, and was not called a recession.",
    },
    {
        "name": "Industrial production YoY",
        "short": "Industrial production YoY",
        "column": "indpro_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "An NBER dating criterion with history back to 1919. Its coincident power (4.60x) has "
                "to be read against a shrinking share of the economy: manufacturing weakness is no "
                "longer synonymous with a downturn.",
    },
    {
        "name": "Real personal consumption YoY",
        "short": "Real PCE YoY",
        "column": "real_pce_yoy",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "An NBER dating criterion, and the most SPECIFIC measure in the model: it fires in "
                "only 2.7% of expansion months, giving the highest coincident odds ratio here at "
                "10.52x. It is also the least SENSITIVE -- only 28.2% of recession months show it, "
                "against 77.6% for manufacturing and trade sales. Total consumption is roughly "
                "two-thirds services, which barely fall, so a year-over-year decline is rare even in "
                "a downturn. Read it as near-conclusive when it fires and uninformative when it does "
                "not. As a forecast it is worthless (0.52x, 1 of 4 episodes), which is what a dating "
                "criterion should be.",
    },
    {
        "name": "Real retail sales YoY",
        "short": "Real retail sales YoY",
        "column": "retail_yoy_real",
        "kind": "coincident",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "Consumers buying less in volume terms. Primarily a description of the present "
                "(75.8% of recession months against 15.4% of expansion months), though the bare "
                "one-month rule does carry modest early warning: it first turns negative a median "
                "7.5 months before the cycle peak.",
    },
    {
        "name": "Real retail sales YoY, 3-month rule",
        "short": "Real retail, 3mo rule",
        "column": "retail_yoy_real",
        "kind": "coincident",
        "condition": "< 0% for 3 months",
        "fires": lambda v: (v < 0) & (v.shift(1) < 0) & (v.shift(2) < 0),
        "note": "The same series with a persistence filter, kept alongside to make the trade-off "
                "visible: demanding three consecutive months cuts lift from 1.52x to 0.74x, and "
                "from 1.67x to 0.34x once recovery months are excluded. Waiting for confirmation "
                "spends the entire lead -- the first negative month arrives a median 7.5 months "
                "before the cycle peak, the third arrives around it.",
    },
    {
        "name": "Inflation minus retail growth",
        "short": "Inflation vs retail",
        "column": "inflation_retail_gap",
        "kind": "coincident",
        "condition": "> +2 pp",
        "fires": lambda v: v > 2.0,
        "note": "Prices outrunning till receipts: real volumes shrinking behind a positive "
                "nominal print.",
    },
    {
        "name": "CPI YoY",
        "short": "CPI YoY",
        "column": "cpi_yoy",
        "kind": "context",
        "condition": "> 4%",
        "fires": lambda v: v > 4.0,
        "note": "Not a recession signal on its own. High inflation squeezes real spending and "
                "invites the rate hikes that historically do the damage.",
    },
    {
        "name": "S&P 500 real (inflation-adjusted) YoY",
        "short": "S&P 500 real YoY",
        "column": "sp500_yoy_real",
        "kind": "market",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "The index deflated by CPI. Much the better of the two market formulations -- 1.69x "
                "against the nominal rule's 0.90x -- because a nominal gain during high inflation is "
                "a real loss, and it is the real loss that coincides with a squeezed economy. It "
                "still fades to 1.02x after 1985.",
    },
    {
        "name": "S&P 500 drawdown from 12m high",
        "short": "S&P 500 drawdown",
        "column": "sp500_drawdown_12m",
        "kind": "market",
        "condition": "< -20%",
        "fires": lambda v: v < -20.0,
        "note": "A documented negative, and the most counter-intuitive result in this table: skill "
                "falls MONOTONICALLY as the drawdown deepens -- 1.25x at -5%, 0.69x at -10%, 0.26x "
                "at -15%, 0.15x at -20% on 1 of 11 episodes. A bear market is not an early warning. "
                "Big declines either happen inside a recession, where they are excluded from this "
                "test, or are standalone crashes that never became one. The market's useful "
                "contribution is the TIMING of its peak, not the size of its fall.",
    },
    {
        "name": "S&P 500 YoY",
        "short": "S&P 500 YoY",
        "column": "sp500_yoy",
        "kind": "market",
        "condition": "< 0%",
        "fires": lambda v: v < 0,
        "note": "The index peak leads the cycle peak by a median 5.5 months, but 'YoY negative' "
                "is a late and noisy way to capture that.",
    },
]


#: Which raw level series each signal column is built from. Used to report a
#: signal's TRUE last observation rather than the frame's last row: monthly
#: levels are forward-filled onto the spine, so a series that last printed in
#: June looks current in an August row. For a "where are we now" reading that
#: difference matters, so each signal is stamped with the oldest input it
#: depends on.
SIGNAL_SOURCE_LEVELS = {
    "yield_curve": ("ust_10y", "ust_3m"),
    "curve_uninverting": ("ust_10y", "ust_3m"),
    "credit_spread_chg12": ("baa", "ust_10y"),
    "permits_yoy": ("permits",),
    "claims_yoy": ("claims",),
    "continued_claims_yoy": ("continued_claims",),
    "sahm": ("sahm",),
    "fed_funds_chg12": ("fed_funds",),
    "real_fed_funds": ("fed_funds", "cpi"),
    "m2_real_yoy": ("m2_real",),
    "fed_assets_yoy": ("fed_assets",),
    "nfci": ("nfci",),
    "lending_standards": ("lending_standards",),
    "state_diffusion": ("state_diffusion",),
    "retail_yoy_real": ("retail_nominal", "cpi"),
    "inflation_retail_gap": ("retail_nominal", "cpi"),
    "cpi_yoy": ("cpi",),
    "mfg_trade_sales_yoy": ("mfg_trade_sales",),
    "income_ex_transfers_yoy": ("income_ex_transfers",),
    "payrolls_yoy": ("payrolls",),
    "indpro_yoy": ("indpro",),
    "real_pce_yoy": ("real_pce",),
    "fiscal_impulse_4q": ("fed_receipts", "fed_outlays", "nominal_gdp"),
    "govt_spending_yoy": ("govt_spending",),
    "german_yield_curve": ("de_10y", "de_3m"),
    "uk_recession": ("uk_recession",),
    "oecd_recession": ("oecd_recession",),
    "ecb_assets_yoy": ("ecb_assets",),
    "china_exports_yoy": ("china_exports",),
    "copper_yoy": ("copper",),
    "boj_assets_yoy": ("boj_assets",),
    "household_debt_yoy": ("household_debt",),
    "net_worth_dpi_yoy": ("net_worth_dpi",),
    "loan_delinquency_chg12": ("loan_delinquency",),
    "saving_rate": ("saving_rate",),
    "sp500_yoy": ("sp500_close",),
    "sp500_yoy_real": ("sp500_close", "cpi"),
    "sp500_drawdown_12m": ("sp500_close",),
    "policy_tightening_score": ("ust_10y", "ust_3m", "fed_funds", "nfci"),
}


def evaluate_signal_skill(
    df: pd.DataFrame,
    spans: list[tuple[pd.Timestamp, pd.Timestamp]],
    horizon: int = 12,
) -> pd.DataFrame:
    """Score every signal on the only question that justifies a warning label:
    given that it fires today, does a recession *begin* within `horizon` months?

    Three choices make this an honest test rather than a flattering one:

    1. Months already inside a recession are excluded. Announcing a recession
       you are demonstrably already in is not a forecast, and leaving those
       months in inflates precision for every coincident indicator.

    2. Precision is reported against the unconditional base rate, and their
       ratio (`lift`) is the headline. A signal that fires constantly can post
       high precision while carrying no information at all; lift near 1.0 means
       exactly that, and lift below 1.0 means the signal fires *less* often
       before recessions than chance would predict.

    3. `lift_ex_recovery` repeats the test with the 12 months following each
       recession removed. This matters more than it sounds: 57% of the retail
       signal's firings in this sample land within a year of a recession
       *ending*, where a depressed year-ago base mechanically produces negative
       year-over-year growth. Those are arithmetic echoes of the last
       recession, not warnings about the next one.
    """
    starts = [s for s, _ in spans]
    ends = [e for _, e in spans]

    def recession_begins_within(dt: pd.Timestamp) -> bool:
        return any(dt < s <= dt + pd.DateOffset(months=horizon) for s in starts)

    def months_since_last_recession(dt: pd.Timestamp) -> float:
        prior = [e for e in ends if e <= dt]
        return (dt - prior[-1]).days / 30.44 if prior else float("inf")

    target = pd.Series({i: recession_begins_within(i) for i in df.index})
    since_end = pd.Series({i: months_since_last_recession(i) for i in df.index})
    expansion = df["recession"] == 0

    rows = []
    for spec in SIGNAL_DEFS:
        col = spec["column"]
        if col not in df.columns or df[col].notna().sum() < 24:
            continue

        fired = spec["fires"](df[col])
        usable = expansion & df[col].notna() & fired.notna()

        def score(mask: pd.Series) -> tuple:
            sub_fire, sub_y = fired[mask].astype(bool), target[mask].astype(bool)
            if not len(sub_y) or not sub_y.any():
                return (len(sub_y), np.nan, np.nan, np.nan, np.nan, np.nan)
            base = float(sub_y.mean())
            tp = int((sub_fire & sub_y).sum())
            fp = int((sub_fire & ~sub_y).sum())
            precision = tp / (tp + fp) if (tp + fp) else np.nan
            recall = tp / int(sub_y.sum())
            lift = precision / base if base and not np.isnan(precision) else np.nan
            # Share of the available improvement actually captured, from 0 (no
            # better than the base rate) to 1 (perfect). Lift alone is not
            # comparable between indicators whose samples start in different
            # decades: the ceiling on lift is 1/base_rate, and the base rate
            # falls from 27.5% before 1960 to 5.9% after 2008. That caps lift at
            # 3.6x for a series measured in the earlier era while allowing 17x
            # in the later one, so a 1990-onward indicator can post a bigger
            # lift than the yield curve while capturing less of what was there.
            skill = (precision - base) / (1 - base) if base < 1 and not np.isnan(precision) else np.nan
            return (len(sub_y), base * 100, precision * 100, recall * 100, lift, skill)

        n, base, prec, rec, lift, skill = score(usable)
        _, _, _, _, lift_ex, _ = score(usable & (since_end > 12))

        # Era split. Lift is measured against each era's own base rate, so a
        # signal can hold its lift while its absolute reliability collapses --
        # which is exactly what the yield curve does. Pooling the full sample
        # hides that, so both halves are reported.
        modern = df.index >= pd.Timestamp(MODERN_ERA_START)
        _, base_pre, prec_pre, _, lift_pre, _ = score(usable & ~modern)
        _, base_mod, prec_mod, _, lift_mod, _ = score(usable & modern)

        # Distinct firing episodes, and how many were followed by a recession.
        # This is the honest denominator. A signal that stays on for a year
        # contributes twelve highly correlated months to `precision` but only
        # one independent test of whether it was right, and the gap between the
        # two numbers is where false confidence lives: the policy composite
        # posts 62 firing months that resolve into just six episodes.
        episodes, hits = _count_episodes(fired[usable].astype(bool), target)

        rows.append(
            {
                "indicator": spec["name"],
                "short": spec["short"],
                "kind": spec["kind"],
                "condition": spec["condition"],
                "months_tested": n,
                "first_observation": df[col].dropna().index.min().date().isoformat(),
                "base_rate_pct": _r(base),
                "precision_pct": _r(prec),
                "recall_pct": _r(rec),
                "lift": _r(lift),
                "lift_ex_recovery": _r(lift_ex),
                "skill_captured": _r(skill, 3),
                "precision_pre1985_pct": _r(prec_pre),
                "lift_pre1985": _r(lift_pre),
                "precision_1985on_pct": _r(prec_mod),
                "lift_1985on": _r(lift_mod),
                "base_rate_1985on_pct": _r(base_mod),
                "max_possible_lift": _r(1 / (base / 100) if base else np.nan),
                "episodes": episodes,
                "episodes_followed_by_recession": hits,
                "verdict": _verdict(lift),
                "note": spec["note"],
            }
        )

    table = pd.DataFrame(rows)
    if not table.empty:
        table = table.sort_values("lift", ascending=False, na_position="last").reset_index(drop=True)
    return table


def _count_episodes(fired: pd.Series, target: pd.Series, gap_days: int = 200) -> tuple[int, int]:
    """Collapse a firing mask into distinct episodes and count how many were
    followed by a recession.

    Consecutive months of the same signal are one event, not many. Two firings
    more than `gap_days` apart are treated as separate episodes.
    """
    times = list(fired.index[fired])
    if not times:
        return 0, 0
    episodes, current = [], [times[0]]
    for t in times[1:]:
        if (t - current[-1]).days > gap_days:
            episodes.append(current)
            current = []
        current.append(t)
    episodes.append(current)
    hits = sum(1 for ep in episodes if any(bool(target.get(t, False)) for t in ep))
    return len(episodes), hits


def _verdict(lift: float) -> str:
    """Plain-language reading of a lift ratio, so the table cannot be skimmed
    into the wrong conclusion."""
    if lift is None or (isinstance(lift, float) and np.isnan(lift)):
        return "not enough data"
    if lift >= 2.0:
        return "strong leading signal"
    if lift >= 1.3:
        return "some leading information"
    if lift >= 0.9:
        return "no leading information"
    return "fires LESS often before recessions than chance"


def current_signals(df: pd.DataFrame, skill: pd.DataFrame,
                    last_observed: dict[str, pd.Timestamp] | None = None) -> pd.DataFrame:
    """Latest reading on every indicator, each stamped with its own measured
    track record.

    An earlier version of this table listed a "warning threshold" per indicator
    and nothing else. That framing implied every row was a forecast, which is
    false for most of them: on this sample the real-retail rule fires *less*
    often before recessions than chance (lift 0.34x once recovery base effects
    are excluded), while the yield curve runs above 3x. Both were presented
    identically. Each row now carries its `kind` and the lift measured by
    `evaluate_signal_skill`, so a triggered coincident indicator cannot be read
    as a prediction.
    """
    ranked = skill.set_index("indicator") if not skill.empty else pd.DataFrame()
    rows = []

    for spec in SIGNAL_DEFS:
        col = spec["column"]
        if col not in df.columns:
            continue
        series = df[col].dropna()
        if series.empty:
            continue

        fired = spec["fires"](df[col]).reindex(series.index)

        # The frame's last row is not the same as the signal's last real
        # observation: the monthly levels are forward-filled, so a series whose
        # newest print is June appears, unchanged, in the August row. Report the
        # oldest genuine observation among the signal's inputs, and say how
        # stale that makes the reading.
        latest_date = series.index[-1]
        stale = 0
        if last_observed:
            sources = [last_observed[k] for k in SIGNAL_SOURCE_LEVELS.get(col, ()) if k in last_observed]
            if sources:
                true_date = min(sources)
                stale = max(0, round((latest_date - true_date).days / 30.44))
                latest_date = min(latest_date, true_date)
        # Everything below is evaluated at latest_date, not at the frame's last
        # row. Reading `value` at the true date while leaving `triggered` on the
        # filled row produced rows that contradicted themselves -- a value of
        # +0.14 reported as firing a "< 0%" condition.
        visible = series.loc[:latest_date]
        fired_visible = fired.loc[:latest_date]
        value = float(visible.iloc[-1]) if len(visible) else float(series.iloc[-1])
        triggered = (
            bool(fired_visible.iloc[-1])
            if len(fired_visible) and pd.notna(fired_visible.iloc[-1])
            else False
        )

        # Months in the last twelve for which the condition held. A single
        # month at the threshold is noise on every one of these series.
        recent = fired_visible.tail(12)
        months_fired = int(recent.sum()) if recent.notna().any() else 0

        entry = ranked.loc[spec["name"]] if spec["name"] in ranked.index else None
        rows.append(
            {
                "indicator": spec["name"],
                "kind": spec["kind"],
                "as_of": latest_date.date().isoformat(),
                "months_stale": stale,
                "value": _r(value),
                "condition": spec["condition"],
                "triggered": triggered,
                "months_fired_last_12": months_fired,
                "measured_lift": entry["lift"] if entry is not None else np.nan,
                "verdict": entry["verdict"] if entry is not None else "not tested",
                "note": spec["note"],
            }
        )

    signals = pd.DataFrame(rows)

    # NBER's own flag, kept last and deliberately outside the skill table: it
    # is the label the others are scored against, not a competitor to them.
    latest = df.dropna(subset=["recession"]).iloc[-1]
    official = pd.DataFrame([
        {
            "indicator": "NBER recession flag (USREC)",
            "kind": "official (lagging)",
            "as_of": latest.name.date().isoformat(),
            "months_stale": 0,
            "value": int(latest["recession"]),
            "condition": "= 1",
            "triggered": int(latest["recession"]) == 1,
            "months_fired_last_12": int(df["recession"].tail(12).sum()),
            "measured_lift": np.nan,
            "verdict": "ground truth, published 6-18 months late",
            "note": "NBER dates recessions well after the fact, so a 0 here rules nothing out.",
        }
    ])
    return pd.concat([signals, official], ignore_index=True)


def _r(value, digits: int = 2):
    """Round, tolerating NaN and non-numerics."""
    try:
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return np.nan
        return round(float(value), digits)
    except (TypeError, ValueError):
        return value


# ---------------------------------------------------------------------------
# Calibrated recession probability
# ---------------------------------------------------------------------------

#: Features for the probability model, fixed in advance rather than chosen by
#: their scores in the skill table. They span distinct economic channels --
#: domestic rates, global rates, financial conditions, housing, labour, credit
#: -- which keeps the design matrix from being six versions of one fact. The
#: binding constraint is the common sample: NFCI starts in 1971, so the model
#: trains on roughly seven recessions and validates on four.
PROBABILITY_FEATURES = (
    "yield_curve",
    "german_yield_curve",
    "nfci",
    "permits_yoy",
    "claims_yoy",
    "credit_spread_chg12",
)

#: Alternative feature sets, kept so the search that produced them is
#: reproducible rather than a claim in a commit message. None of them improves
#: the model in a way that survives scrutiny -- see FINDING feature search in
#: the readme sheet. "direction" adds short-horizon changes to test whether the
#: model can be taught to tell a deteriorating economy from a recovering one;
#: "reduced" tests whether fewer parameters help on a small sample.
PROBABILITY_FEATURE_SETS = {
    "default": PROBABILITY_FEATURES,
    "direction": PROBABILITY_FEATURES + ("claims_chg3", "nfci_chg3"),
    "reduced": ("yield_curve", "nfci", "claims_yoy"),
}

#: Strong L2 shrinkage. With a few hundred rows and a handful of positive
#: episodes, an unregularised fit separates the classes almost perfectly and
#: emits probabilities near 0 and 1 that the data cannot support.
PROBABILITY_L2 = 300.0

#: Events the probability model can be pointed at. The recession label is a
#: committee's retrospective judgement with 15 instances in a century; the
#: others are objective, real-time and far more frequent, and one of them is
#: measurably more predictable from the same features. Each entry is
#: (description, builder, exclude_months_already_in_recession).
def _target_recession(df, spans, horizon, idx):
    starts = [s for s, _ in spans]
    return pd.Series(
        {i: float(any(i < s <= i + pd.DateOffset(months=horizon) for s in starts)) for i in idx}
    )


def _target_drawdown(threshold_pct):
    def build(df, spans, horizon, idx):
        px = df["sp500_close"]
        out = {}
        for i in idx:
            window = px.loc[i:i + pd.DateOffset(months=horizon)].dropna()
            out[i] = (
                float(((window / window.cummax() - 1.0) * 100.0).min() <= -threshold_pct)
                if len(window) > 2 else np.nan
            )
        return pd.Series(out)
    return build


def _target_rise(column, points):
    def build(df, spans, horizon, idx):
        series = df[column]
        out = {}
        for i in idx:
            now = series.get(i, np.nan)
            window = series.loc[i:i + pd.DateOffset(months=horizon)]
            out[i] = float((window.max() - now) >= points) if len(window) > 2 and pd.notna(now) else np.nan
        return pd.Series(out)
    return build


def _target_fall(column, points):
    def build(df, spans, horizon, idx):
        series = df[column]
        out = {}
        for i in idx:
            now = series.get(i, np.nan)
            window = series.loc[i:i + pd.DateOffset(months=horizon)]
            out[i] = float((now - window.min()) >= points) if len(window) > 2 and pd.notna(now) else np.nan
        return pd.Series(out)
    return build


PROBABILITY_TARGETS = {
    "recession": ("an NBER recession begins", _target_recession, True),
    "fed_cut": ("the Fed cuts rates by 1pp or more", _target_fall("fed_funds", 1.0), False),
    "unemployment_rise": ("unemployment rises by 1pp or more", _target_rise("unemployment", 1.0), True),
    "equity_drawdown": ("the S&P falls 20% or more from its peak", _target_drawdown(20.0), False),
}

#: Minimum years of history before the walk-forward begins predicting.
PROBABILITY_MIN_TRAIN_YEARS = 18

#: Standardised features are clipped to this many standard deviations of the
#: TRAINING distribution before entering the model. Without it a linear model
#: extrapolates without limit on inputs it has never seen: in mid-2020 jobless
#: claims rose by an order of magnitude, the logit saturated, and the model
#: emitted 100.0% for ten consecutive months (May 2020 - Feb 2021) in every one
#: of which no recession began within the horizon. Clipping says the honest
#: thing instead -- "this is past the edge of my experience, treat it as the
#: edge" -- rather than compounding an unprecedented input into false certainty.
FEATURE_CLIP_SD = 4.0


def _sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30.0, 30.0)))


def _fit_logit(x: np.ndarray, y: np.ndarray, lam: float, iters: int = 60):
    """L2-regularised logistic regression by Newton/IRLS. Intercept unpenalised.

    Hand-rolled rather than pulled from scikit-learn so the model keeps its
    small dependency set, and so the regularisation is visible at the point of
    use rather than buried in a library default.
    """
    mu, sd = x.mean(axis=0), x.std(axis=0)
    sd = np.where(sd < 1e-9, 1.0, sd)
    scaled = np.clip((x - mu) / sd, -FEATURE_CLIP_SD, FEATURE_CLIP_SD)
    z = np.column_stack([np.ones(len(x)), scaled])
    w = np.zeros(z.shape[1])
    penalty = np.eye(z.shape[1]) * lam
    penalty[0, 0] = 0.0
    for _ in range(iters):
        p = np.clip(_sigmoid(z @ w), 1e-9, 1 - 1e-9)
        weights = p * (1 - p)
        gradient = z.T @ (y - p) - penalty @ w
        hessian = -(z.T * weights) @ z - penalty
        try:
            step = np.linalg.solve(hessian, gradient)
        except np.linalg.LinAlgError:
            break
        new = w - step
        if not np.all(np.isfinite(new)):
            break
        if np.max(np.abs(new - w)) < 1e-8:
            w = new
            break
        w = new
    return w, mu, sd


def _logit_score(model, x: np.ndarray) -> np.ndarray:
    w, mu, sd = model
    scaled = np.clip((x - mu) / sd, -FEATURE_CLIP_SD, FEATURE_CLIP_SD)
    return np.column_stack([np.ones(len(x)), scaled]) @ w


def recession_probability(
    df: pd.DataFrame,
    spans: list[tuple[pd.Timestamp, pd.Timestamp]],
    horizon: int = 12,
    lam: float = PROBABILITY_L2,
    shrink: float = 1.0,
    min_train_years: int = PROBABILITY_MIN_TRAIN_YEARS,
    feature_set: str = "default",
    target: str = "recession",
) -> tuple[pd.DataFrame, dict, pd.DataFrame]:
    """Walk-forward probability that a recession BEGINS within `horizon` months.

    Every number this returns is out of sample. At each month t the model is
    refitted using only rows whose outcome was already observable, which means
    rows dated t - horizon or earlier: the label for month s is not known until
    s + horizon has passed, so training on anything later would let the answer
    leak into the question.

    Two layers, and the second is what makes the thing work at all:

      1. A strongly regularised logistic regression on the features above.
      2. A nested calibration step. The training window is split 70/30 in time;
         the regression is fitted on the earlier part and a one-dimensional
         Platt correction is fitted on the later part, both strictly before the
         cutoff. Raw logistic output on this data is badly overconfident --
         uncalibrated it scores a NEGATIVE Brier skill of -0.24 against simply
         predicting the base rate, saying 77% where the truth was 41%. With the
         calibration layer skill turns positive at every regularisation setting
         tried (+0.08 to +0.27). Discrimination was never the problem: AUC is
         ~0.93 either way. Confidence was.

    `shrink` optionally blends the result toward the training base rate.
    Left at 1.0 by default -- the untuned choice -- because selecting it on
    out-of-sample results is itself a form of fitting to the test set.
    """
    features = PROBABILITY_FEATURE_SETS.get(feature_set, PROBABILITY_FEATURES)
    available = [f for f in features if f in df.columns]
    if len(available) < 3:
        raise DataFetchError(
            f"probability model needs at least 3 of {features}, have {available}"
        )
    if len(available) < len(features):
        log.warning("Probability model running on %d of %d features: %s",
                    len(available), len(features), ", ".join(available))

    description, builder, drop_recession_months = PROBABILITY_TARGETS[target]
    x = df[available].dropna()
    if drop_recession_months:
        x = x[df["recession"].reindex(x.index) == 0]
    y = builder(df, spans, horizon, x.index).astype("float64")
    keep = y.notna()
    x, y = x[keep], y[keep]
    if x.empty or y.sum() < 5:
        raise DataFetchError("not enough history to fit the probability model")

    first_prediction = x.index.min() + pd.DateOffset(years=min_train_years)
    rows = []
    for t in x.index[x.index >= first_prediction]:
        cutoff = t - pd.DateOffset(months=horizon)
        train = x.index[x.index <= cutoff]
        if len(train) < 120 or y[train].sum() < 3:
            continue
        split = int(len(train) * 0.70)
        fit_idx, cal_idx = train[:split], train[split:]
        if len(cal_idx) < 40 or y[cal_idx].sum() < 2:
            continue

        model = _fit_logit(x.loc[fit_idx].values, y[fit_idx].values, lam)
        cal_scores = _logit_score(model, x.loc[cal_idx].values).reshape(-1, 1)
        calibrator = _fit_logit(cal_scores, y[cal_idx].values, 1.0)

        score = _logit_score(model, x.loc[[t]].values).reshape(-1, 1)
        p = float(_sigmoid(_logit_score(calibrator, score))[0])
        base = float(y[train].mean())
        rows.append(
            {
                "date": t,
                "probability_pct": _r(100.0 * (shrink * p + (1 - shrink) * base)),
                "base_rate_pct": _r(100.0 * base),
                "recession_began_within_horizon": int(y[t]),
            }
        )

    oos = pd.DataFrame(rows).set_index("date")
    if oos.empty:
        raise DataFetchError("walk-forward produced no out-of-sample predictions")

    p = oos["probability_pct"].to_numpy() / 100.0
    b = oos["base_rate_pct"].to_numpy() / 100.0
    actual = oos["recession_began_within_horizon"].to_numpy().astype(float)

    def _brier(pred):
        return float(np.mean((pred - actual) ** 2))

    def _logloss(pred):
        pred = np.clip(pred, 1e-6, 1 - 1e-6)
        return float(-np.mean(actual * np.log(pred) + (1 - actual) * np.log(1 - pred)))

    def _auc(pred):
        order = np.argsort(pred)
        ranked = actual[order]
        pos, neg = ranked.sum(), len(ranked) - ranked.sum()
        if pos == 0 or neg == 0:
            return float("nan")
        r = np.arange(1, len(ranked) + 1)
        return float((r[ranked == 1].sum() - pos * (pos + 1) / 2) / (pos * neg))

    brier, brier_base = _brier(p), _brier(b)

    # Skill excluding the 12 months after each recession ends. The distinction
    # matters more here than anywhere else in this model: in the recovery the
    # features still look like a crisis, and a model with no way to tell an
    # approach from an aftermath calls a recession that has already happened.
    # May 2020 is the clearest case -- 95% with the recession one month behind
    # it, not ahead.
    ends = [e for _, e in spans]
    months_since_end = np.array([
        min([(t - e).days / 30.44 for e in ends if e <= t], default=999.0)
        for t in oos.index
    ])
    settled = months_since_end > 12
    skill_ex_recovery = np.nan
    if settled.sum() > 24 and actual[settled].sum() > 0:
        bm = float(np.mean((p[settled] - actual[settled]) ** 2))
        bb = float(np.mean((b[settled] - actual[settled]) ** 2))
        skill_ex_recovery = 1 - bm / bb if bb else np.nan

    validation = {
        "out_of_sample_from": oos.index.min().date().isoformat(),
        "out_of_sample_to": oos.index.max().date().isoformat(),
        "months_scored": int(len(oos)),
        "recessions_in_window": int(
            sum(1 for st, _ in spans if oos.index.min() <= st <= oos.index.max())
        ),
        "actual_positive_rate_pct": _r(100.0 * actual.mean()),
        "brier_model": _r(brier, 4),
        "brier_base_rate_benchmark": _r(brier_base, 4),
        "brier_skill_score": _r(1 - brier / brier_base if brier_base else np.nan, 3),
        "brier_skill_excluding_recoveries": _r(skill_ex_recovery, 3),
        "log_loss_model": _r(_logloss(p), 4),
        "log_loss_base_rate": _r(_logloss(b), 4),
        "auc": _r(_auc(p), 3),
        "current_probability_pct": _r(oos["probability_pct"].iloc[-1]),
        "current_as_of": oos.index.max().date().isoformat(),
        "feature_set": feature_set,
        "target": target,
        "target_description": description,
        "horizon_months": int(horizon),
    }

    # Reliability: does a 20% forecast come true 20% of the time?
    edges = [0.0, 0.05, 0.10, 0.20, 0.35, 1.0001]
    binned = pd.cut(p, edges, include_lowest=True)
    reliability = (
        pd.DataFrame({"bin": binned, "pred": p, "actual": actual})
        .groupby("bin", observed=True)
        .agg(months=("actual", "size"), mean_forecast_pct=("pred", "mean"),
             actual_rate_pct=("actual", "mean"))
        .reset_index()
    )
    reliability["bin"] = reliability["bin"].astype(str)
    reliability["mean_forecast_pct"] = (reliability["mean_forecast_pct"] * 100).round(1)
    reliability["actual_rate_pct"] = (reliability["actual_rate_pct"] * 100).round(1)
    return oos, validation, reliability


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


def chart3_signal_skill(df, skill: pd.DataFrame, spans, outpath: Path, dpi: int, horizon: int) -> Path:
    """Chart 3 -- which indicators actually lead, and the one that clearly does.

    This is the chart that changed the model's conclusions. Panel B ranks every
    indicator by measured lift; panel A plots the winner. The retail and market
    series that motivated the whole exercise sit below the no-information line,
    which is the honest headline and the reason this panel exists rather than a
    prettier restatement of chart 1.
    """
    fig, (ax_a, ax_b) = plt.subplots(
        1, 2, figsize=(16, 9.6), gridspec_kw={"width_ratios": [1.0, 1.0], "wspace": 0.30}
    )
    fig.patch.set_facecolor(SURFACE)

    # ---------------- Panel A: the yield curve ------------------------------
    _style_axes(ax_a)
    _shade_recessions(ax_a, spans)
    curve = df["yield_curve"].dropna() if "yield_curve" in df.columns else pd.Series(dtype=float)
    if not curve.empty:
        ax_a.axhline(0, color=ZERO_LINE, linewidth=1.2, zorder=2)
        ax_a.plot(curve.index, curve, color=C_RETAIL, linewidth=1.9, zorder=3)
        # Fill only the inversions: the condition being tested, made visible.
        ax_a.fill_between(curve.index, curve, 0, where=(curve < 0), interpolate=True,
                          color=C_RECESSION, alpha=0.55, linewidth=0, zorder=3)
        ax_a.set_xlim(curve.index.min(), curve.index.max())
        ax_a.set_ylim(min(-2.0, curve.min() - 0.4), curve.max() + 0.4)

    ax_a.set_ylabel("10-year minus 3-month Treasury (pp)", color=INK_SECONDARY, fontsize=10.5, labelpad=8)
    ax_a.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:+.0f}"))
    ax_a.xaxis.set_major_locator(mdates.YearLocator(10))
    ax_a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax_a.set_title("A.  The one that leads: yield curve inversions",
                   loc="left", fontsize=12.5, fontweight="bold", color=INK_PRIMARY, pad=12)
    handles_a = [
        Line2D([], [], color=C_RETAIL, linewidth=2.4, label="10y − 3m Treasury spread"),
        Patch(facecolor=C_RECESSION, alpha=0.6, label="Inverted (spread below zero)"),
        Patch(facecolor=C_RECESSION, alpha=0.18, label="NBER recession"),
    ]
    leg_a = ax_a.legend(handles=handles_a, loc="upper left", bbox_to_anchor=(0.0, -0.06),
                        frameon=True, fontsize=9.5, borderpad=0.6, ncol=3, columnspacing=1.6,
                        framealpha=1.0)
    leg_a.get_frame().set_facecolor(SURFACE)
    leg_a.get_frame().set_edgecolor(GRID)
    for text in leg_a.get_texts():
        text.set_color(INK_SECONDARY)

    # ---------------- Panel B: measured lift, ranked ------------------------
    _style_axes(ax_b)
    ax_b.grid(axis="y", visible=False)
    bars = skill.dropna(subset=["lift"]).sort_values("lift")
    y = np.arange(len(bars))
    # Diverging encoding about the no-information line: blue carries
    # information, red fires less often than chance would predict.
    colors = [C_RETAIL if v >= 1.0 else C_RECESSION for v in bars["lift"]]
    ax_b.barh(y, bars["lift"], color=colors, height=0.62, zorder=3)
    ax_b.axvline(1.0, color=INK_PRIMARY, linewidth=1.6, linestyle="--", alpha=0.8, zorder=4)
    ax_b.annotate("no information", xy=(1.0, len(bars) - 0.35), xytext=(6, 0),
                  textcoords="offset points", fontsize=9, color=INK_SECONDARY, va="center")

    ax_b.set_yticks(y)
    # Kind on its own line: with sixteen bars the single-line form runs wide
    # enough to collide with panel A no matter how the gutter is sized.
    ax_b.set_yticklabels([f"{n}\n({k})" for n, k in zip(bars["short"], bars["kind"])],
                         fontsize=9.0, linespacing=1.25)
    ax_b.tick_params(axis="y", labelcolor=INK_SECONDARY)
    ax_b.set_xlim(0, max(4.2, float(bars["lift"].max()) * 1.55))
    ax_b.set_xlabel(f"Lift: precision ÷ base rate, for a recession starting within {horizon} months\n"
                    f"'n/m ep' = distinct firing episodes followed by a recession, out of all episodes",
                    color=INK_SECONDARY, fontsize=10.5, labelpad=10)
    # Integer ticks explicitly: the default locator lands on half-steps, which a
    # "{:.0f}x" formatter renders as duplicated labels (0x 0x 1x 2x 2x 2x).
    ax_b.xaxis.set_major_locator(matplotlib.ticker.MultipleLocator(1.0))
    ax_b.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:.0f}x"))

    # Direct-label every bar: far more categories than colour alone may carry.
    # The episode ratio rides alongside the lift because the two can disagree,
    # and when they do the episode count is the one to believe -- the policy
    # composite outranks the yield curve on lift while hitting 3 of 6 episodes
    # against the curve's 7 of 9.
    has_eps = {"episodes", "episodes_followed_by_recession"} <= set(bars.columns)
    for i, (yi, v) in enumerate(zip(y, bars["lift"])):
        ax_b.annotate(f"{v:.2f}x", xy=(v, yi), xytext=(6, 0), textcoords="offset points",
                      va="center", fontsize=9.5, fontweight="bold", color=INK_PRIMARY)
        if has_eps:
            row = bars.iloc[i]
            ax_b.annotate(f"{int(row['episodes_followed_by_recession'])}/{int(row['episodes'])} ep",
                          xy=(v, yi), xytext=(52, 0), textcoords="offset points",
                          va="center", fontsize=8.5, color=INK_MUTED)

    ax_b.set_title("B.  Measured skill of every indicator in the model",
                   loc="left", fontsize=12.5, fontweight="bold", color=INK_PRIMARY, pad=12)

    fig.suptitle("What actually predicts a recession — and what only looks like it does",
                 x=0.045, ha="left", fontsize=17, fontweight="bold", color=INK_PRIMARY, y=0.98)
    fig.text(0.045, 0.017,
             "Scored on expansion months only, so a signal cannot score by announcing a recession already under way. "
             "Sources: FRED · Yahoo Finance.",
             fontsize=8.5, color=INK_MUTED, ha="left")

    # Panel B's category labels are long and hang to the left of its axis, so
    # this needs a real gutter rather than the default spacing.
    fig.subplots_adjust(left=0.055, right=0.975, top=0.875, bottom=0.165, wspace=0.42)
    fig.savefig(outpath, dpi=dpi, facecolor=SURFACE, bbox_inches="tight")
    plt.close(fig)
    log.info("Wrote %s", outpath)
    return outpath


def chart4_probability(oos: pd.DataFrame, validation: dict, reliability: pd.DataFrame,
                       spans, outpath: Path, dpi: int, horizon: int) -> Path:
    """Chart 4 -- the out-of-sample probability, and whether it can be believed.

    Panel A is the forecast itself against the recessions it was trying to
    anticipate. Panel B is the part that decides whether panel A means
    anything: a reliability diagram. A forecast is calibrated when its curve
    sits on the diagonal -- when the months it called 20% turned out to be
    recessions 20% of the time. Points below the diagonal are overconfidence.
    """
    fig, (ax_a, ax_b) = plt.subplots(
        1, 2, figsize=(16, 7.0), gridspec_kw={"width_ratios": [1.55, 1.0], "wspace": 0.30}
    )
    fig.patch.set_facecolor(SURFACE)

    # ---- Panel A: probability through time --------------------------------
    _style_axes(ax_a)
    _shade_recessions(ax_a, spans)
    prob = oos["probability_pct"]
    ax_a.plot(prob.index, prob, color=C_RETAIL, linewidth=2.0, zorder=3)
    ax_a.fill_between(prob.index, prob, 0, color=C_RETAIL, alpha=0.13, linewidth=0, zorder=2)
    ax_a.plot(oos.index, oos["base_rate_pct"], color=INK_MUTED, linewidth=1.4,
              linestyle="--", zorder=3)
    ax_a.set_ylim(0, max(60.0, float(prob.max()) * 1.15))
    ax_a.set_ylabel(f"P({validation.get('target_description', 'recession')} within {horizon} months)",
                    color=INK_SECONDARY, fontsize=10.5, labelpad=8)
    ax_a.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:.0f}%"))
    ax_a.xaxis.set_major_locator(mdates.YearLocator(5))
    ax_a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax_a.set_xlim(prob.index.min(), prob.index.max())
    ax_a.set_title(f"A.  Out-of-sample probability: {validation.get('target_description', 'recession')}",
                   loc="left", fontsize=12.5,
                   fontweight="bold", color=INK_PRIMARY, pad=12)

    last = float(prob.iloc[-1])
    ax_a.annotate(f"{last:.1f}%  ({prob.index[-1]:%b %Y})",
                  xy=(prob.index[-1], last), xytext=(-8, 16), textcoords="offset points",
                  ha="right", fontsize=10, fontweight="bold", color=INK_PRIMARY,
                  bbox=dict(boxstyle="round,pad=0.3", facecolor=SURFACE, edgecolor=C_RETAIL,
                            linewidth=1.0))
    handles = [
        Line2D([], [], color=C_RETAIL, linewidth=2.4, label="Model probability (walk-forward)"),
        Line2D([], [], color=INK_MUTED, linewidth=1.8, linestyle="--", label="Base rate at time of forecast"),
        Patch(facecolor=C_RECESSION, alpha=0.18, label="NBER recession"),
    ]
    leg = ax_a.legend(handles=handles, loc="upper left", bbox_to_anchor=(0.0, -0.07),
                      frameon=True, fontsize=9.5, ncol=3, borderpad=0.6, framealpha=1.0)
    leg.get_frame().set_facecolor(SURFACE)
    leg.get_frame().set_edgecolor(GRID)
    for t in leg.get_texts():
        t.set_color(INK_SECONDARY)

    # ---- Panel B: reliability ---------------------------------------------
    _style_axes(ax_b)
    ax_b.plot([0, 100], [0, 100], color=INK_PRIMARY, linewidth=1.6, linestyle="--",
              alpha=0.75, zorder=2)
    ax_b.annotate("perfect calibration", xy=(58, 62), fontsize=9, color=INK_SECONDARY,
                  rotation=38, ha="center", va="center")
    sizes = 30 + 220 * reliability["months"] / max(1, reliability["months"].max())
    ax_b.scatter(reliability["mean_forecast_pct"], reliability["actual_rate_pct"],
                 s=sizes, facecolor=C_RETAIL, edgecolor=SURFACE, linewidth=1.0, zorder=4)
    ax_b.plot(reliability["mean_forecast_pct"], reliability["actual_rate_pct"],
              color=C_RETAIL, linewidth=1.6, alpha=0.55, zorder=3)
    for _, r in reliability.iterrows():
        ax_b.annotate(f"n={int(r['months'])}",
                      xy=(r["mean_forecast_pct"], r["actual_rate_pct"]), xytext=(9, -4),
                      textcoords="offset points", fontsize=8.5, color=INK_MUTED)
    ax_b.set_xlim(0, 100); ax_b.set_ylim(0, 100)
    ax_b.set_xlabel("Forecast probability", color=INK_SECONDARY, fontsize=10.5, labelpad=8)
    ax_b.set_ylabel("Recessions that actually followed", color=INK_SECONDARY, fontsize=10.5, labelpad=8)
    for axis in (ax_b.xaxis, ax_b.yaxis):
        axis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:.0f}%"))
    ax_b.set_title("B.  Reliability: below the line is overconfidence", loc="left",
                   fontsize=12.5, fontweight="bold", color=INK_PRIMARY, pad=12)
    ax_b.annotate(
        f"Brier skill vs base rate  {validation['brier_skill_score']:+.3f}\n"
        f"AUC  {validation['auc']:.3f}\n"
        f"{validation['months_scored']} months, "
        f"{validation['recessions_in_window']} recessions",
        xy=(0.97, 0.04), xycoords="axes fraction", ha="right", va="bottom", fontsize=9.5,
        color=INK_SECONDARY,
        bbox=dict(boxstyle="round,pad=0.45", facecolor=SURFACE, edgecolor=GRID, linewidth=1.0))

    fig.suptitle(f"How likely is it that {validation.get('target_description', 'a recession begins')}"
                 f" — and can the number be believed?",
                 x=0.045, ha="left", fontsize=17, fontweight="bold", color=INK_PRIMARY, y=0.975)
    fig.text(0.045, 0.017,
             "Every point is out of sample: the model is refitted each month on data whose outcome was "
             "already observable. Sources: FRED · Yahoo Finance.",
             fontsize=8.5, color=INK_MUTED, ha="left")
    fig.subplots_adjust(left=0.055, right=0.975, top=0.855, bottom=0.175, wspace=0.28)
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
        ("SMOOTHING (--smooth)", "Trailing average on the CPI and retail levels before any growth "
                                 "rate is computed. Measured: N=3 halves month-to-month churn in the "
                                 "YoY rate (sd 2.44 -> 1.24) and cuts zero-crossings 108 -> 52; the "
                                 "coincident odds ratio improves 4.93x -> 5.13x. But leading skill is "
                                 "unchanged (lift ~0.74x at every N), because the failure is base "
                                 "effects, not noise -- and the first negative month slips from 7.5 "
                                 "months BEFORE the cycle peak to 1.5 before (N=3) and 1.0 AFTER "
                                 "(N=6). Smooth to read the present; do not smooth to forecast."),
        ("PERSISTENCE", "Demanding consecutive negative months is costly for the same reason: lift "
                        "falls 1.52x -> 0.99x -> 0.74x for 1, 2 and 3 consecutive months. Both rules "
                        "ship in the skill table so the trade-off stays visible."),
        ("", ""),
        ("SHEET: monthly_merged", "Analysis frequency. One row per month, month-start stamped."),
        ("SHEET: daily_merged", "Business-day spine with monthly macro series forward-filled onto it."),
        ("SHEET: recession_episodes", "One row per NBER contraction with market and retail behaviour."),
        ("SHEET: probability_oos", "Walk-forward P(recession begins within the horizon). Every row "
                                   "is out of sample -- the model is refitted each month on rows whose "
                                   "outcome was already observable."),
        ("SHEET: probability_validation", "Whether the probability can be believed. Read "
                                          "brier_skill_score FIRST."),
        ("SHEET: probability_reliability", "Did months forecast at X% become recessions X% of the time?"),
        ("FINDING the probability", "The honest headline is that this model does NOT beat the base rate "
                                    "out of sample: Brier skill -0.030 across 371 months and 3 "
                                    "recessions. It discriminates well (AUC 0.893) and is well "
                                    "calibrated in the low and middle ranges -- 1.2% forecasts saw 0.0%, "
                                    "13.4% saw 14.8%, 25.5% saw 33.3% -- but it is badly overconfident "
                                    "at the top, where 67% forecasts saw 25%. Two episodes account for "
                                    "most of that: May 2020, where it read 95% with the recession one "
                                    "month BEHIND rather than ahead, and spring 2023, where it read "
                                    "~90% on a yield-curve inversion that never became a recession. "
                                    "Excluding the 12 months after each recession, skill is +0.112. So "
                                    "the usable claim is narrow: below roughly 20% the number means "
                                    "what it says; above that, discount it heavily."),
        ("FINDING other targets", "The same features and machinery, pointed at four different "
                                  "events over 12 months, out of sample. Fed cuts of 1pp or more: "
                                  "skill +0.332, AUC 0.865, and well calibrated to about 75% -- it "
                                  "said 36.6% and saw 37.0%. NBER recession: -0.030, AUC 0.893, "
                                  "calibration breaking from 50% up. Unemployment rising 1pp: -0.336 "
                                  "with AUC 0.841, so it discriminates and cannot size. S&P falling "
                                  "20% from its peak: -0.604 with AUC 0.272 -- BELOW 0.5, meaning "
                                  "systematically inverted. The macro state that looks recessionary "
                                  "is followed by FEWER large drawdowns, not more, which independently "
                                  "corroborates the earlier finding that the widest inflation-over-"
                                  "retail quintile saw the best forward returns. Bad macro is priced "
                                  "before it is measured."),
        ("FINDING why fed_cut works", "It is not simply that there are more events, though there are "
                                      "(20.9% base rate against 6.5%). A policy reaction function is "
                                      "more learnable than a business-cycle turning point: the Fed "
                                      "responds systematically to the very conditions these features "
                                      "measure, whereas a recession is a committee's retrospective "
                                      "judgement about an emergent process. The lesson generalises -- "
                                      "prefer targets that are objective, frequent, and produced by a "
                                      "rule rather than a verdict."),
        ("FINDING feature search", "Better features do NOT rescue the skill score. Six pre-specified "
                                   "variants were walked forward: baseline -0.030, plus direction "
                                   "features +0.051, plus payrolls -0.030, reduced to three features "
                                   "-0.091, plus lending standards -4.300 (its 1990 start truncates the "
                                   "sample to 170 months with too few positives), direction features "
                                   "alone -0.005 with AUC 0.531 -- levels carry all the discrimination, "
                                   "changes carry none. The +0.051 variant looks like an improvement "
                                   "and does not survive a mechanism check: it fixes exactly what it "
                                   "was designed to fix, cutting mid-recovery false alarms from 80-85% "
                                   "to 38-51% in late 2020, but makes every one of the model's worst "
                                   "calls MORE confident -- spring 2023 from 89-94% to 94-97%, May 2020 "
                                   "from 95% to 98%. A better average bought with worse tails is the "
                                   "wrong trade for a probability anyone would act on, so the default "
                                   "is unchanged. Across every variant the overall skill stays within "
                                   "-0.09 to +0.05, which three out-of-sample recessions cannot "
                                   "distinguish. Features are not the binding constraint."),
        ("CAVEAT probability layers", "Raw logistic output scored -0.243 -- worse than the base rate, "
                                      "saying 77% where the truth was 41%. A nested Platt calibration "
                                      "fitted strictly inside the training window is what makes it "
                                      "usable, and skill was positive at every regularisation setting "
                                      "once calibrated. Features are also clipped to 4 training standard "
                                      "deviations: without that the model emitted 100.0% for ten "
                                      "consecutive months in 2020, wrong every time, because a linear "
                                      "model extrapolates without limit on inputs it has never seen."),
        ("SHEET: signal_skill", "Every indicator scored on: given it fires, does a recession BEGIN "
                                "within the horizon? Read the `lift` column first."),
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
        ("COLUMN yield_curve", "10-year minus 3-month Treasury yield, pp. Negative = inverted."),
        ("COLUMN credit_spread", "Moody's Baa corporate yield minus the 10-year Treasury, pp."),
        ("COLUMN credit_spread_chg12", "12-month change in that spread. The level is regime-dependent "
                                       "and stays wide through recoveries; the change is the signal."),
        ("COLUMN permits_yoy", "12-month percent change in residential building permits."),
        ("COLUMN claims_yoy", "12-month percent change in initial jobless claims."),
        ("COLUMN sahm", "Real-time Sahm rule: unemployment's 3-month average minus its 12-month low."),
        ("", ""),
        ("READING lift", "precision divided by the unconditional base rate. 1.0x means the signal "
                         "carries no information: recessions follow it exactly as often as they follow "
                         "any random month. Below 1.0x it fires LESS often before recessions than chance."),
        ("READING skill_captured", "Share of the available improvement the signal captures, 0 to 1. "
                                   "Prefer this to lift when comparing indicators whose samples start in "
                                   "different decades. Lift is capped at 1/base_rate, and the base rate "
                                   "is not stable: 'recession begins within 12 months' runs at 27.5% of "
                                   "months in 1928-1959, 21.6% in 1960-1984, 13.8% in 1985-2007 and 5.9% "
                                   "in 2008-2026. A series measured only in the modern era therefore has "
                                   "roughly triple the headroom on lift that a long-history series has."),
        ("READING era split", "precision_pre1985_pct / precision_1985on_pct and their lifts. Read "
                              "these before acting on the pooled number: several signals that dominate "
                              "the full-sample ranking are worthless in the modern era. Fed tightening "
                              "goes from 67.2% precision to 0.0%; real M2 from 77.8% to 1.1%; the policy "
                              "composite, top of the pooled table, from 72.7% to 0.0%. Soft landings "
                              "are a modern phenomenon and the monetary signals do not survive them."),
        ("FINDING China", "No Chinese signal earns a place. China exports 0.99x, China imports "
                          "0.99x, China CPI deflation 0.18x, the yuan 0.98x, US imports from China "
                          "1.45x on 2 of 13 episodes, and a Chinese recession 1.12x against the UK "
                          "indicator's 2.14x -- despite China being far the larger economy. Copper, "
                          "the usual China-demand proxy, is purely coincident: 4.57x coincident and "
                          "0.00x leading on 0 of 8 episodes at -20% YoY. Bounding all of it: every "
                          "China series begins in the 1990s and covers only three US recessions, and "
                          "China became macro-significant to the US only after 2001. Weak evidence "
                          "of absence rather than evidence of absence."),
        ("FINDING fiscal policy", "No fiscal aggregate carries leading information. Deficit widening "
                                  "scores 0.17x, deficit consolidation 0.78x, real government spending "
                                  "falling 0.53x, a deficit worse than 5% of GDP 0.00x on 0 of 8 "
                                  "episodes. The reason is endogeneity: automatic stabilisers widen the "
                                  "deficit because a recession is happening, so it is a symptom being "
                                  "read as a cause. Measured directly, >1pp-of-GDP widening first "
                                  "appears a median ONE MONTH AFTER the recession begins and leads it "
                                  "in only 3 of 12 cases. As a coincident marker it is strong (5.48x "
                                  "odds at the 2pp threshold); as a forecast it is worse than nothing."),
        ("FINDING the market's role", "The S&P is the model's WORST predictor and one of its better "
                                      "descriptions. As a signal: nominal YoY < 0 scores 0.90x, below "
                                      "the no-information line; deflating by CPI lifts it to 1.69x; and "
                                      "drawdown depth runs BACKWARDS -- 1.25x at -5% falling to 0.15x at "
                                      "-20%. A bear market is not an early warning. What the index does "
                                      "carry is timing: its peak leads the NBER cycle peak by a median "
                                      "5.5 months, though with a standard deviation of 5.1 and under one "
                                      "month of warning in 5 of 15 recessions. Its other role here is as "
                                      "the thing being predicted rather than the predictor -- chart 2 "
                                      "asks what the market DID after a squeezed consumer, not what it "
                                      "foretold."),
        ("FINDING what changed", "The yield curve keeps its LIFT across the break (3.28x to 3.08x) while "
                                 "its absolute reliability collapses (82.1% to 31.8% precision). Both are "
                                 "true: relative to a base rate that fell from 25% to 10% it is as "
                                 "informative as ever, but an inversion today is much weaker evidence "
                                 "than an inversion in 1970. Signals that IMPROVED after 1985 are the "
                                 "credit and labour ones -- financial conditions 1.52x to 3.29x, jobless "
                                 "claims 1.76x to 2.67x, continued claims 1.18x to 2.20x -- and the curve "
                                 "un-inverting, 1.48x to 4.14x, the strongest modern signal in the table."),
        ("FINDING NBER definition", "NBER has NOT switched away from a two-quarters-of-falling-GDP rule, "
                                    "because it never used one. Quarters that meet the technical rule but "
                                    "were not NBER recessions number zero in every era since 1948 except "
                                    "1947 Q3; the reverse case -- NBER recessions without two negative "
                                    "quarters -- numbers 13, 14, 8 and 1 across the eras. NBER has always "
                                    "been broader than the popular rule. What HAS changed is the object: "
                                    "recessions are about four times rarer, shorter in median duration "
                                    "(8mo since 1985 against 10-11mo before) and sharper (median real "
                                    "retail trough -9.4% against -4.7%, median S&P drawdown -30.2% "
                                    "against -18.6%). The 2020 call, at two months, also broke NBER's "
                                    "usual duration norm outright."),
        ("CAVEAT Great Moderation", "The US spent 24.2% of months in recession before 1960 and 5.8% in "
                                    "1985-2007. Pooling the whole sample averages across genuinely "
                                    "different regimes, and a signal that worked in the volatile "
                                    "post-war decades is not thereby shown to work now."),
        ("READING episodes", "Consecutive firing months are ONE event, not many. A signal that stays "
                             "on for a year contributes twelve correlated months to precision but only "
                             "one independent test. Where lift and the episode ratio disagree, believe "
                             "the episode ratio: the policy composite outranks the yield curve on lift "
                             "(3.65x vs 3.43x) while hitting 3 of 6 episodes against the curve's 7 of 9."),
        ("FINDING central bank", "Fed tightening (>2pp in 12m) scores 2.73x and financial conditions "
                                 "(NFCI > 0) 2.76x. Neither is redundant with the yield curve: NFCI "
                                 "co-fires with it at only phi +0.16, and restricted to months when the "
                                 "curve is NOT inverted still scores 2.91x. When curve and NFCI fire "
                                 "together precision reaches 93%, but on 29 months in few episodes -- "
                                 "suggestive, not established."),
        ("FINDING QE", "Balance sheet growth does NOT explain the market. The raw correlation between "
                       "Fed assets YoY and S&P YoY is -0.42, and that negative sign is endogeneity, not "
                       "evidence QE hurts stocks: the Fed expands the balance sheet precisely when "
                       "markets are falling. QT as a recession signal scores 1.01x on three recessions. "
                       "Separately, the market's link to the real economy did not weaken after 2008 -- "
                       "corr(S&P YoY, real retail YoY) rose from +0.36 (1953-2008) to +0.58 (2009-2026)."),
        ("READING kind", "coincident = describes the present. leading = claims to predict. Only a "
                         "leading indicator with lift above ~1.3 supports a forecasting statement."),
        ("FINDING retail", "Real retail contraction is a strong COINCIDENT marker -- 75.8% of recession "
                           "months show it against 15.6% of expansion months -- and has no leading value: "
                           "lift 0.74x, falling to 0.34x once post-recession recovery months are excluded. "
                           "57% of its firings land within a year of a recession ENDING, where a depressed "
                           "year-ago base mechanically produces negative growth."),
        ("", ""),
        ("CAVEAT Temporal basis", "CPI and retail sales are published with a 2-6 week lag and are revised; "
                                  "the S&P is real time. Same-month rows are not same-information rows."),
        ("CAVEAT NBER lag", "NBER dates recessions 6-18 months after the fact. USREC is a historical label, "
                            "not a real-time signal."),
        ("CAVEAT Retail splice", "Pre-1992 retail levels come from a discontinued SIC-basis series rescaled onto "
                                 "the NAICS basis. Growth rates are comparable; absolute levels are indicative."),
        ("CAVEAT Price-only index", "S&P figures exclude dividends, understating total return by roughly "
                                    "2-4pp a year in the earlier decades of the sample."),
        ("CAVEAT Thresholds", "Signal thresholds are conventional rules of thumb, not fitted parameters. "
                              "Each has produced false positives."),
        ("CAVEAT In-sample", "The skill table scores every indicator over the full history, with thresholds "
                             "chosen in hindsight. It is a description of the past, not an out-of-sample "
                             "backtest, and it flatters every signal to some degree. Treat lift as a way to "
                             "RANK indicators against each other, not as an expected hit rate."),
        ("CAVEAT Revisions", "Retail sales and CPI are revised for years after first release, so the "
                             "skill table is computed on numbers nobody had at the time. Full real-time "
                             "evaluation needs vintage data from ALFRED, which this model does not fetch."),
        ("FINDING revisions", "The direction of the revision bias is NOT obvious, and one natural "
                              "experiment here runs against the usual assumption. FRED publishes the Sahm "
                              "rule twice: SAHMREALTIME uses only data available at the time, SAHMCURRENT "
                              "uses revised data. Scored identically, the REAL-TIME version does BETTER "
                              "(0.79x, 1.33x ex-recovery) than the revised one (0.61x, 0.00x ex-recovery). "
                              "Revision made that indicator a sharper coincident detector, which fires it "
                              "closer to the recession and therefore scores it worse as a leading signal. "
                              "So do not assume final-data scoring flatters every indicator; for this one "
                              "it penalised it. The caveat above remains real but its sign is untested for "
                              "retail sales and CPI specifically."),
        ("CAVEAT Small n", "Fifteen recessions since 1927, and fewer for indicators that start later. "
                           "Differences between adjacent lifts in the table are not statistically "
                           "meaningful; only the large gaps are."),
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

    # Optional trailing smoothing of the input levels. Trailing, never centred:
    # a centred window would average in months a real-time observer had not
    # seen yet, which would leak future information into every past reading.
    #
    # Measured effect on this data (see --smooth in the readme sheet): a
    # 3-month average halves the month-to-month churn in the YoY rate (sd 2.44
    # -> 1.24) and cuts zero-crossings from 108 to 52, and it slightly sharpens
    # the coincident reading (recession/expansion odds ratio 4.93x -> 5.13x).
    # What it does not do is fix the leading problem, because that problem is
    # base effects rather than noise -- and it costs most of the warning time:
    # the first negative month moves from 7.5 months BEFORE the cycle peak to
    # 1.5 months before at N=3, and to 1.0 months AFTER at N=6. Smoothing is
    # therefore the right call for reading the present and the wrong one for
    # anticipating the future.
    if args.smooth > 1:
        log.info("Applying %d-month trailing average to CPI and retail levels", args.smooth)
        cpi = cpi.rolling(args.smooth, min_periods=args.smooth).mean().dropna()
        retail = retail.rolling(args.smooth, min_periods=args.smooth).mean().dropna()
        splice_note += f"; {args.smooth}-month trailing average applied to levels"
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

    # Comparison indicators. Each is optional: a failure costs one row of the
    # skill table and nothing else, so a FRED hiccup on BAA10Y must not take
    # down a run whose core series all arrived.
    indicators: dict[str, pd.Series] = {}
    for name, (series_id, how) in FRED_INDICATORS.items():
        try:
            raw = fetch_fred_series(series_id, args.start)
        except DataFetchError as exc:
            log.warning("Comparison indicator %s unavailable, skipping: %s", series_id, exc)
            continue
        # BAA10Y is daily and ICSA weekly; both need collapsing to the monthly
        # analysis grid before they can join the frame.
        resampled = raw.resample("MS").mean() if how == "mean" else raw.resample("MS").last()
        indicators[name] = resampled.dropna()
        provenance.add(name, "FRED", series_id, indicators[name], f"resampled to monthly ({how})")

    if args.state_diffusion:
        try:
            diffusion = fetch_state_diffusion(args.start)
            indicators["state_diffusion"] = diffusion
            provenance.add("state_diffusion", "FRED", "<50 state UR series>", diffusion,
                           "share of states with unemployment >= 0.5pp above its 12-month low")
        except DataFetchError as exc:
            log.warning("State diffusion index unavailable: %s", exc)

    # ----- 2. Align --------------------------------------------------------
    log.info("Aligning series ...")
    monthly_levels = {
        "cpi": to_month_start(cpi),
        "retail_nominal": to_month_start(retail),
        "recession": to_month_start(usrec),
        **{k: to_month_start(v) for k, v in indicators.items()},
    }
    core_levels = {k: monthly_levels[k] for k in ('cpi', 'retail_nominal', 'recession')}
    daily = build_daily_frame(spx, core_levels)
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
    skill = evaluate_signal_skill(monthly, spans, horizon=args.horizon)

    prob_oos, prob_validation, prob_reliability = None, {}, None
    if not args.no_probability:
        log.info("Fitting walk-forward recession probability ...")
        try:
            prob_oos, prob_validation, prob_reliability = recession_probability(
                monthly, spans, horizon=args.horizon, shrink=args.prob_shrink,
                feature_set=args.prob_features, target=args.prob_target)
            monthly["recession_probability_pct"] = prob_oos["probability_pct"].reindex(monthly.index)
        except DataFetchError as exc:
            log.warning("Probability model unavailable: %s", exc)
    # True last-observation date per raw level, taken before the forward-fill.
    last_observed = {name: series.index.max() for name, series in monthly_levels.items() if len(series)}
    last_observed["sp500_close"] = spx.index.max().to_period("M").to_timestamp(how="start")
    signals = current_signals(monthly, skill, last_observed)

    # ----- 4. Charts -------------------------------------------------------
    log.info("Rendering charts ...")
    chart1 = chart1_timeseries(monthly, spans, outdir / "chart1_macro_timeseries.png", args.dpi)
    chart2 = chart2_correlation(monthly, spans, outdir / "chart2_correlation.png", args.dpi, args.rolling_window)
    charts = [chart1, chart2]
    if not skill.empty:
        charts.append(chart3_signal_skill(monthly, skill, spans,
                                          outdir / "chart3_signal_skill.png", args.dpi, args.horizon))
    if prob_oos is not None and not prob_oos.empty:
        charts.append(chart4_probability(prob_oos, prob_validation, prob_reliability, spans,
                                         outdir / "chart4_probability.png", args.dpi, args.horizon))

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
            "signal_skill": skill,
            "probability_oos": prob_oos.round(3).reset_index().assign(
                date=lambda d: d["date"].dt.date) if prob_oos is not None else None,
            "probability_validation": pd.DataFrame(
                [{"metric": k, "value": v} for k, v in prob_validation.items()]
            ) if prob_validation else None,
            "probability_reliability": prob_reliability,
            "current_signals": signals,
        },
    )

    # ----- 6. Console summary ---------------------------------------------
    _print_summary(monthly, episodes, leadlag, signals, skill, spans, [xlsx, *charts],
                   prob_validation, prob_reliability)
    return 0


def _print_summary(monthly, episodes, leadlag, signals, skill, spans, artifacts,
                   prob_validation=None, prob_reliability=None) -> None:
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

    if not skill.empty:
        print("\nSignal skill -- given the signal fires, does a recession BEGIN within the horizon?")
        print("  (expansion months only; lift = precision / base rate, so 1.0x means no information)")
        print(f"  {'indicator':<36}{'kind':<12}{'lift':>7}{'ex-rec':>8}{'episodes':>10}   verdict")
        for _, r in skill.iterrows():
            lift = f"{r['lift']:.2f}x" if pd.notna(r["lift"]) else "  n/a"
            ex = f"{r['lift_ex_recovery']:.2f}x" if pd.notna(r["lift_ex_recovery"]) else "  n/a"
            eps = f"{int(r['episodes_followed_by_recession'])}/{int(r['episodes'])}"
            print(f"  {r['indicator'][:35]:<36}{r['kind']:<12}{lift:>7}{ex:>8}{eps:>10}   {r['verdict']}")

    print("\nCurrent readings:")
    for _, row in signals.iterrows():
        mark = "FIRING" if row["triggered"] else "  --  "
        value = f"{row['value']:>9.2f}" if isinstance(row["value"], (int, float, np.floating)) else f"{row['value']:>9}"
        lift = f"{row['measured_lift']:.2f}x" if pd.notna(row["measured_lift"]) else "  n/a"
        age = f" [{int(row['months_stale'])}mo old]" if row.get("months_stale", 0) else ""
        print(f"  [{mark}] {row['indicator'][:34]:<36}{value}  {row['as_of']}  {row['condition']:<18}"
              f"lift {lift:>6}{age}")

    lead_fired = signals[(signals["kind"] == "leading") & signals["triggered"]]
    print(f"\n  {int(signals['triggered'].sum())} of {len(signals)} indicators firing; "
          f"{len(lead_fired)} of them carry any leading information.")
    print("  A firing COINCIDENT indicator describes the present, not the future -- check the")
    print("  lift column before reading any row here as a forecast.")

    if prob_validation:
        v = prob_validation
        print("\nCALIBRATED PROBABILITY (walk-forward, out of sample)")
        print(f"  P({v.get('target_description', 'an NBER recession begins')} within "
              f"{v.get('horizon_months', 12)} months) = {v['current_probability_pct']:.1f}%  "
              f"as of {v['current_as_of']}")
        print(f"  validated {v['out_of_sample_from']} to {v['out_of_sample_to']}: "
              f"{v['months_scored']} months, {v['recessions_in_window']} recessions")
        print(f"  Brier {v['brier_model']:.4f} vs {v['brier_base_rate_benchmark']:.4f} for the base rate "
              f"-> skill {v['brier_skill_score']:+.3f}   AUC {v['auc']:.3f}")
        ex = v.get("brier_skill_excluding_recoveries")
        if ex is not None and not (isinstance(ex, float) and np.isnan(ex)):
            print(f"  skill excluding the 12 months after each recession: {ex:+.3f}")
        if v["brier_skill_score"] is not None and v["brier_skill_score"] <= 0.02:
            print("  READ THIS: overall skill is at or below zero. The model DISCRIMINATES well")
            print("  (high AUC) but does not beat simply quoting the base rate. Its confident")
            print("  failures -- May 2020 at 95%, and ~90% through spring 2023 on an inversion")
            print("  that never became a recession -- cost as much as its successes earn.")
        if prob_reliability is not None and not prob_reliability.empty:
            print("  reliability (forecast vs what actually followed):")
            for _, r in prob_reliability.iterrows():
                print(f"    said {r['mean_forecast_pct']:5.1f}%  ->  actual {r['actual_rate_pct']:5.1f}%"
                      f"   ({int(r['months'])} months)")

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
    parser.add_argument("--no-probability", action="store_true",
                        help="Skip the walk-forward calibrated probability model")
    parser.add_argument("--prob-target", default="recession",
                        choices=sorted(PROBABILITY_TARGETS),
                        help="Which event to model. 'fed_cut' is measurably the most predictable of "
                             "these from the same features; 'equity_drawdown' is the least, and is "
                             "predicted WORSE than chance")
    parser.add_argument("--prob-features", default="default",
                        choices=sorted(PROBABILITY_FEATURE_SETS),
                        help="Feature set for the probability model. None of the alternatives beats "
                             "the default once their tail behaviour is examined; they exist so the "
                             "comparison is reproducible")
    parser.add_argument("--prob-shrink", type=float, default=1.0, metavar="A",
                        help="Blend the calibrated probability toward the base rate: "
                             "A*p + (1-A)*base. 1.0 leaves it untouched")
    parser.add_argument("--state-diffusion", action="store_true",
                        help="Also build a 50-state unemployment diffusion index (a breadth measure "
                             "rather than a national aggregate). Costs 50 extra FRED calls and, on "
                             "this data, is dominated by the yield curve -- off by default")
    parser.add_argument("--smooth", type=int, default=1, metavar="N",
                        help="Trailing N-month average applied to the CPI and retail LEVELS before "
                             "any growth rate is computed. 1 disables it. Cuts month-to-month noise "
                             "sharply but delays every signal by roughly (N-1)/2 months")
    parser.add_argument("--horizon", type=int, default=12,
                        help="Forecast horizon, in months, that the signal skill test scores against")
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
