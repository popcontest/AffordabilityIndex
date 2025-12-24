#!/usr/bin/env python3
"""
Census Geocoding API client for backfilling county FIPS codes.

Provides:
- Single address geocoding
- Batch geocoding (up to 10,000 addresses)
- Retry logic with exponential backoff
- County FIPS extraction from responses
"""

import logging
import time
from typing import Optional, List, Tuple, Dict
import requests

logger = logging.getLogger(__name__)


class GeocodingError(Exception):
    """Exception raised for geocoding errors."""
    pass


class CensusGeocoder:
    """
    Client for Census Geocoding API.

    Documentation: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
    """

    BASE_URL = "https://geocoding.geo.census.gov/geocoder"

    def __init__(self, benchmark: str = "Public_AR_Current", vintage: str = "Current_Current"):
        """
        Initialize geocoder.

        Args:
            benchmark: Census benchmark dataset
            vintage: Census vintage dataset
        """
        self.benchmark = benchmark
        self.vintage = vintage
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AffordabilityIndex-ETL/1.0 (Python)'
        })

    def geocode_address(
        self,
        city: str,
        state: str,
        retry_count: int = 3,
        retry_delay: float = 1.0
    ) -> Optional[str]:
        """
        Geocode a city/state to get county FIPS code.

        Args:
            city: City name
            state: State abbreviation
            retry_count: Number of retries on failure
            retry_delay: Initial delay between retries (exponential backoff)

        Returns:
            5-digit county FIPS code or None if geocoding fails

        Example:
            fips = geocoder.geocode_address('Chicago', 'IL')
            # Returns: '17031' (Cook County, IL)
        """
        url = f"{self.BASE_URL}/locations/onelineaddress"

        params = {
            'address': f"{city}, {state}",
            'benchmark': self.benchmark,
            'format': 'json'
        }

        for attempt in range(retry_count):
            try:
                response = self.session.get(url, params=params, timeout=10)
                response.raise_for_status()

                data = response.json()

                # Extract county FIPS from result
                matches = data.get('result', {}).get('addressMatches', [])

                if not matches:
                    logger.debug(f"No geocoding match for {city}, {state}")
                    return None

                # Get first match
                match = matches[0]
                geographies = match.get('geographies', {})
                counties = geographies.get('Counties', [])

                if not counties:
                    logger.debug(f"No county found for {city}, {state}")
                    return None

                county = counties[0]
                county_fips = county.get('GEOID')

                if county_fips and len(county_fips) == 5:
                    logger.debug(f"Geocoded {city}, {state} -> {county_fips}")
                    return county_fips
                else:
                    logger.warning(f"Invalid county FIPS for {city}, {state}: {county_fips}")
                    return None

            except requests.exceptions.RequestException as e:
                if attempt < retry_count - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"Geocoding failed (attempt {attempt + 1}/{retry_count}), retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Geocoding failed after {retry_count} attempts for {city}, {state}: {e}")
                    return None

            except Exception as e:
                logger.error(f"Unexpected geocoding error for {city}, {state}: {e}")
                return None

        return None

    def batch_geocode_cities(
        self,
        cities: List[Tuple[str, str, str]],
        rate_limit_delay: float = 0.1,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, str]:
        """
        Geocode multiple cities to get county FIPS codes.

        Args:
            cities: List of tuples (city_id, city_name, state_abbr)
            rate_limit_delay: Delay between requests (seconds)
            progress_callback: Optional callback function(completed, total)

        Returns:
            Dict mapping city_id to county FIPS code

        Example:
            results = geocoder.batch_geocode_cities([
                ('city1', 'Chicago', 'IL'),
                ('city2', 'Phoenix', 'AZ')
            ])
            # Returns: {'city1': '17031', 'city2': '04013'}
        """
        results = {}
        total = len(cities)

        logger.info(f"Starting batch geocoding of {total:,} cities")

        for i, (city_id, city_name, state_abbr) in enumerate(cities, 1):
            county_fips = self.geocode_address(city_name, state_abbr)

            if county_fips:
                results[city_id] = county_fips

            # Rate limiting
            if i < total:
                time.sleep(rate_limit_delay)

            # Progress reporting
            if progress_callback and i % 100 == 0:
                progress_callback(i, total)

            if i % 100 == 0:
                success_rate = len(results) / i * 100
                logger.info(f"Progress: {i:,}/{total:,} ({i/total*100:.1f}%) - Success rate: {success_rate:.1f}%")

        success_rate = len(results) / total * 100 if total > 0 else 0
        logger.info(f"Batch geocoding complete: {len(results):,}/{total:,} successful ({success_rate:.1f}%)")

        return results

    def geocode_with_coordinates(
        self,
        lat: float,
        lng: float,
        retry_count: int = 3
    ) -> Optional[str]:
        """
        Geocode coordinates to get county FIPS code (more accurate than address).

        Args:
            lat: Latitude
            lng: Longitude
            retry_count: Number of retries on failure

        Returns:
            5-digit county FIPS code or None

        Example:
            fips = geocoder.geocode_with_coordinates(41.8781, -87.6298)
            # Returns: '17031' (Cook County, IL - Chicago)
        """
        url = f"{self.BASE_URL}/geographies/coordinates"

        params = {
            'x': lng,
            'y': lat,
            'benchmark': self.benchmark,
            'vintage': self.vintage,
            'format': 'json'
        }

        for attempt in range(retry_count):
            try:
                response = self.session.get(url, params=params, timeout=10)
                response.raise_for_status()

                data = response.json()

                # Extract county FIPS
                geographies = data.get('result', {}).get('geographies', {})
                counties = geographies.get('Counties', [])

                if not counties:
                    logger.debug(f"No county found for coordinates ({lat}, {lng})")
                    return None

                county = counties[0]
                county_fips = county.get('GEOID')

                if county_fips and len(county_fips) == 5:
                    logger.debug(f"Geocoded ({lat}, {lng}) -> {county_fips}")
                    return county_fips
                else:
                    logger.warning(f"Invalid county FIPS for ({lat}, {lng}): {county_fips}")
                    return None

            except requests.exceptions.RequestException as e:
                if attempt < retry_count - 1:
                    time.sleep(1.0 * (2 ** attempt))
                else:
                    logger.error(f"Coordinate geocoding failed: {e}")
                    return None

            except Exception as e:
                logger.error(f"Unexpected error geocoding coordinates: {e}")
                return None

        return None
