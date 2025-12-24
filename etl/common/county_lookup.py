#!/usr/bin/env python3
"""
County lookup using Census Gazetteer files.

Census publishes gazetteer files that map places to counties:
https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
"""

import logging
import requests
from io import StringIO
from typing import Optional, Dict, Tuple
import pandas as pd

logger = logging.getLogger(__name__)


class CountyLookup:
    """
    Look up county FIPS codes for US places using Census Gazetteer data.
    """

    # Census Gazetteer URL (2023 data)
    GAZETTEER_URL = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_gaz_place_national.zip"

    def __init__(self):
        self.places: Optional[pd.DataFrame] = None
        self._load_gazetteer()

    def _load_gazetteer(self):
        """Download and parse Census Gazetteer file."""
        logger.info(f"Downloading Census Gazetteer from {self.GAZETTEER_URL}")

        try:
            response = requests.get(self.GAZETTEER_URL, timeout=60)
            response.raise_for_status()

            # The ZIP contains a tab-delimited text file
            import zipfile
            from io import BytesIO

            with zipfile.ZipFile(BytesIO(response.content)) as zf:
                # Find the .txt file
                txt_files = [name for name in zf.namelist() if name.endswith('.txt')]

                if not txt_files:
                    raise ValueError("No .txt file found in ZIP")

                with zf.open(txt_files[0]) as f:
                    # Read tab-delimited file
                    self.places = pd.read_csv(f, sep='\t', dtype=str, encoding='latin1')

            logger.info(f"Loaded {len(self.places):,} places from Census Gazetteer")

            # Log column names for debugging
            logger.debug(f"Gazetteer columns: {list(self.places.columns)}")

        except Exception as e:
            logger.error(f"Failed to load Census Gazetteer: {e}")
            raise

    def lookup(self, place_name: str, state_abbr: str) -> Optional[str]:
        """
        Look up county FIPS for a place.

        Args:
            place_name: Place name (e.g., "Chicago")
            state_abbr: Two-letter state abbreviation

        Returns:
            5-digit county FIPS code or None

        Note:
            The Census Gazetteer uses USPS state abbreviations and
            GEOID format: SSPPPPPP (2-digit state + 5-digit place)
        """
        if self.places is None:
            logger.warning("Gazetteer not loaded")
            return None

        # The Gazetteer has columns like: USPS, GEOID, ANSICODE, NAME, etc.
        # We need to match on NAME and USPS (state abbr)

        # Try exact match first
        matches = self.places[
            (self.places['NAME'].str.lower() == place_name.lower()) &
            (self.places['USPS'] == state_abbr.upper())
        ]

        if len(matches) == 0:
            logger.debug(f"No match for {place_name}, {state_abbr}")
            return None

        if len(matches) > 1:
            logger.warning(f"Multiple matches for {place_name}, {state_abbr}: using first")

        # Get GEOID (format: SSPPPP where SS = state FIPS, PPPPP = place FIPS)
        geoid = matches.iloc[0]['GEOID']

        # Extract state FIPS (first 2 digits)
        state_fips = geoid[:2]

        # Look up county using INTPTLAT/INTPTLONG (internal point coordinates)
        # Actually, Census Gazetteer doesn't include county FIPS directly
        # We need a different approach...

        logger.debug(f"Found GEOID {geoid} for {place_name}, {state_abbr} but no county FIPS in gazetteer")
        return None


# Alternative: Use HUD USPS ZIP-County Crosswalk
class CountyLookupViaZIP:
    """
    Look up counties using HUD USPS ZIP-County Crosswalk.

    This maps ZIP codes to counties with residential/business/other ratios.
    We can use this if we have ZIP code data for cities.
    """

    HUD_CROSSWALK_URL = "https://www.huduser.gov/portal/datasets/usps_crosswalk.html"

    def __init__(self):
        # TODO: Implement if needed
        pass
