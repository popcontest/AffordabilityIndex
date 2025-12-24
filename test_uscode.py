#!/usr/bin/env python3
"""
Test if uszipcode has place-to-county mapping capability.
Note: This library primarily does ZIP codes, but may have city data.
"""

# Try using a simple approach: FCC Area API which provides city-to-county lookup
import requests

def lookup_county_via_fcc(city, state_abbr):
    """
    Use FCC Area API to find county for a city.
    Free, no auth required, excellent coverage.
    """
    url = "https://geo.fcc.gov/api/census/area"

    params = {
        'lat': '',  # We'll need coordinates first...
        'lon': '',
        'format': 'json'
    }

    # Actually this needs coordinates. Let me try a different approach.
    pass

# Alternative: Use HUD USPS Crosswalk which maps ZIPs to counties
# We could use cities' primary ZIP codes to find their counties

# Simplest: Use Census PLACES API
def test_census_places():
    """Try Census Places API"""
    # https://api.census.gov/data/2020/dec/pl?get=NAME&for=place:*&in=state:17
    url = "https://api.census.gov/data/2020/dec/pl"
    params = {
        'get': 'NAME',
        'for': 'place:*',
        'in': 'state:17'  # Illinois
    }

    response = requests.get(url, params=params, timeout=10)
    print("Census Places API response:")
    print(response.json()[:5])

if __name__ == '__main__':
    test_census_places()
