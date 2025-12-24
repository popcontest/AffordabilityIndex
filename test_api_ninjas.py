"""
Test script to verify API Ninjas Property Tax API.
This helps diagnose why the import collected 0 records.
"""

import requests
import os
import json

# API configuration
API_NINJAS_KEY = os.getenv('API_NINJAS_KEY', '')
API_NINJAS_BASE = "https://api.api-ninjas.com/v1/propertytax"

def test_api_call(city, state, zip_code=None):
    """Test a single API call and print detailed response."""
    print(f"\n{'='*60}")
    if zip_code:
        print(f"Testing: ZIP {zip_code}")
    else:
        print(f"Testing: {city}, {state}")
    print('='*60)

    if not API_NINJAS_KEY:
        print("ERROR: No API_NINJAS_KEY found in environment!")
        print("Set it with: $env:API_NINJAS_KEY='your_key_here' (PowerShell)")
        print("Or: export API_NINJAS_KEY=your_key_here (Bash)")
        return None

    headers = {'X-Api-Key': API_NINJAS_KEY}
    params = {}

    if zip_code:
        params['zip_code'] = zip_code
    else:
        params['city'] = city
        params['state'] = state

    print(f"\nRequest URL: {API_NINJAS_BASE}")
    print(f"Headers: X-Api-Key: {API_NINJAS_KEY[:8]}...")
    print(f"Params: {params}")

    try:
        response = requests.get(API_NINJAS_BASE, headers=headers, params=params, timeout=10)

        print(f"\nStatus Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print(f"\nResponse Data (raw):")
            print(json.dumps(data, indent=2))

            if data:
                print(f"\nData structure:")
                print(f"  Type: {type(data)}")
                print(f"  Length: {len(data) if isinstance(data, list) else 'N/A'}")

                if isinstance(data, list) and len(data) > 0:
                    print(f"\nFirst item keys: {list(data[0].keys())}")
                    print(f"First item values:")
                    for key, value in data[0].items():
                        print(f"  {key}: {value}")

                    # Check for the expected fields
                    expected_fields = ['percentile_25', 'percentile_50', 'percentile_75']
                    for field in expected_fields:
                        if field in data[0]:
                            print(f"  ✓ {field} found: {data[0][field]}")
                        else:
                            print(f"  ✗ {field} NOT found")
                else:
                    print("  Empty response or not a list!")
            else:
                print("\nResponse is empty!")

        elif response.status_code == 401:
            print("\nERROR: Authentication failed (401 Unauthorized)")
            print("The API key may be invalid or expired.")

        elif response.status_code == 403:
            print("\nERROR: Access forbidden (403 Forbidden)")
            print("The API key may not have access to this endpoint.")

        elif response.status_code == 429:
            print("\nERROR: Rate limit exceeded (429 Too Many Requests)")
            print("You've hit the API rate limit.")

        elif response.status_code == 404:
            print("\nERROR: Endpoint not found (404 Not Found)")
            print("The API endpoint may not exist or the URL is incorrect.")

        else:
            print(f"\nERROR: Unexpected status code {response.status_code}")
            print(f"Response text: {response.text}")

        return response

    except requests.exceptions.Timeout:
        print("\nERROR: Request timed out after 10 seconds")
        return None

    except requests.exceptions.RequestException as e:
        print(f"\nERROR: Request failed: {e}")
        return None

    except Exception as e:
        print(f"\nERROR: Unexpected error: {e}")
        return None


def main():
    print("="*60)
    print("API Ninjas Property Tax API Test")
    print("="*60)

    # Test cases
    test_cases = [
        {"city": "Seattle", "state": "WA", "zip_code": None},
        {"city": "Austin", "state": "TX", "zip_code": None},
        {"city": None, "state": None, "zip_code": "98101"},  # Seattle ZIP
        {"city": None, "state": None, "zip_code": "78701"},  # Austin ZIP
    ]

    for case in test_cases:
        test_api_call(case["city"], case["state"], case["zip_code"])

    print("\n" + "="*60)
    print("Test complete!")
    print("="*60)


if __name__ == "__main__":
    main()
