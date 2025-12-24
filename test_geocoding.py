#!/usr/bin/env python3
"""Test Census Geocoding API"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'etl'))

from common.geocoding import CensusGeocoder

geocoder = CensusGeocoder()

# Test a few known cities
test_cities = [
    ("Chicago", "IL"),
    ("Phoenix", "AZ"),
    ("Philadelphia", "PA"),
]

print("Testing Census Geocoding API...\n")

for city, state in test_cities:
    fips = geocoder.geocode_address(city, state)
    print(f"{city}, {state} -> {fips}")
