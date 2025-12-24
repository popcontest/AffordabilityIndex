#!/usr/bin/env python3
"""
Test FCC Area API for county lookup using coordinates.
"""
import requests

# Test with Chicago coordinates
lat = 41.8781
lng = -87.6298

url = "https://geo.fcc.gov/api/census/area"
params = {
    'lat': lat,
    'lon': lng,
    'format': 'json'
}

response = requests.get(url, params=params, timeout=10)
data = response.json()

print("FCC API Response for Chicago:")
print(f"County FIPS: {data['results'][0]['county_fips']}")
print(f"County Name: {data['results'][0]['county_name']}")
print(f"State: {data['results'][0]['state_name']}")
