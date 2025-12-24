#!/usr/bin/env python3
"""
Build comprehensive Census Place → County FIPS mapping.

Downloads TIGER Place files for all states, extracts coordinates,
uses FCC Area API to get county FIPS, and saves to CSV.

This is a ONE-TIME operation that creates a reusable lookup table.

Usage:
    python build_place_county_mapping.py [--states AL,AK,AZ...] [--output mapping.csv]
"""

import os
import sys
import argparse
import logging
import time
import requests
import zipfile
import tempfile
from io import BytesIO
from dbfread import DBF
import csv

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# State FIPS codes
STATE_FIPS = {
    '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
    '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
    '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
    '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
    '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
    '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
    '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR'
}


def get_county_fips_from_coords(lat, lng, retry_count=3):
    """Use FCC Area API to get county FIPS from coordinates."""
    url = "https://geo.fcc.gov/api/census/area"
    params = {'lat': lat, 'lon': lng, 'format': 'json'}

    for attempt in range(retry_count):
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'results' in data and len(data['results']) > 0:
                county_fips = data['results'][0].get('county_fips')
                if county_fips:
                    return county_fips
            return None

        except Exception as e:
            if attempt < retry_count - 1:
                time.sleep(0.5)
            else:
                logger.warning(f"Failed to geocode ({lat}, {lng}): {e}")
                return None


def process_state(state_fips, rate_limit_delay=0.1):
    """Download and process TIGER Place file for one state."""
    state_abbr = STATE_FIPS[state_fips]
    url = f"https://www2.census.gov/geo/tiger/TIGER2023/PLACE/tl_2023_{state_fips}_place.zip"

    logger.info(f"Processing {state_abbr} (FIPS {state_fips})...")

    try:
        # Download ZIP file
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        # Extract DBF from ZIP to temporary file
        with zipfile.ZipFile(BytesIO(response.content)) as zf:
            dbf_name = f"tl_2023_{state_fips}_place.dbf"

            # Extract DBF content
            dbf_content = zf.read(dbf_name)

            # Write to temporary file (dbfread requires file path)
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.dbf', delete=False) as tmp_file:
                tmp_file.write(dbf_content)
                tmp_file_path = tmp_file.name

            try:
                places = []
                for record in DBF(tmp_file_path, encoding='latin1'):
                    place_name = record['NAME']
                    lat = float(record['INTPTLAT'])
                    lng = float(record['INTPTLON'])

                    # Get county FIPS from FCC API
                    county_fips = get_county_fips_from_coords(lat, lng)

                    if county_fips:
                        places.append({
                            'name': place_name,
                            'state_abbr': state_abbr,
                            'county_fips': county_fips,
                            'lat': lat,
                            'lng': lng
                        })

                    # Rate limiting
                    time.sleep(rate_limit_delay)

                    if len(places) % 50 == 0:
                        logger.info(f"  {state_abbr}: Processed {len(places)} places...")

                logger.info(f"  {state_abbr}: Complete - {len(places)} places mapped")
                return places
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)

    except Exception as e:
        logger.error(f"Failed to process {state_abbr}: {e}")
        return []


def main():
    parser = argparse.ArgumentParser(description='Build Census Place → County FIPS mapping')
    parser.add_argument('--states', help='Comma-separated state FIPS codes (default: all states)')
    parser.add_argument('--output', default='census_place_county_mapping.csv', help='Output CSV file')
    parser.add_argument('--rate-limit', type=float, default=0.1, help='Delay between API calls (seconds)')
    args = parser.parse_args()

    # Determine which states to process
    if args.states:
        state_fips_list = args.states.split(',')
    else:
        state_fips_list = list(STATE_FIPS.keys())

    logger.info(f"Building place-county mapping for {len(state_fips_list)} states...")
    logger.info(f"Rate limit: {args.rate_limit}s between API calls")
    logger.info(f"Output: {args.output}")

    all_places = []

    for state_fips in state_fips_list:
        places = process_state(state_fips, rate_limit_delay=args.rate_limit)
        all_places.extend(places)

    # Save to CSV
    logger.info(f"Saving {len(all_places):,} place mappings to {args.output}...")

    with open(args.output, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'state_abbr', 'county_fips', 'lat', 'lng'])
        writer.writeheader()
        writer.writerows(all_places)

    logger.info("Complete!")
    logger.info(f"Total places mapped: {len(all_places):,}")


if __name__ == '__main__':
    main()
