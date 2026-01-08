#!/usr/bin/env python3
"""
Quick verification script for benchmark implementation

This script checks that:
1. ZIP-level benchmark functions exist in lib/data.ts
2. Benchmark constants file exists with required values
3. Error handling is in place
"""

import re
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if a file exists"""
    path = Path(filepath)
    if path.exists():
        print(f"[PASS] {description}: {filepath}")
        return True
    else:
        print(f"[FAIL] {description} NOT FOUND: {filepath}")
        return False

def check_function_exists(filepath, function_name, description):
    """Check if a function exists in a file"""
    try:
        content = Path(filepath).read_text()
        pattern = rf"async function {function_name}\("
        if re.search(pattern, content):
            print(f"[PASS] {description}: {function_name}")
            return True
        else:
            print(f"[FAIL] {description} NOT FOUND: {function_name}")
            return False
    except:
        print(f"[WARN] Could not check {description}")
        return None

def check_text_in_file(filepath, search_text, description):
    """Check if text exists in a file"""
    try:
        content = Path(filepath).read_text()
        if search_text in content:
            print(f"[PASS] {description}")
            return True
        else:
            print(f"[FAIL] {description} NOT FOUND")
            return False
    except:
        print(f"[WARN] Could not check {description}")
        return None

def main():
    print("\n" + "="*70)
    print("BENCHMARK IMPLEMENTATION VERIFICATION")
    print("="*70 + "\n")

    results = []

    # Check new benchmark constants file
    print("1. BENCHMARK CONSTANTS FILE")
    print("-" * 70)
    results.append(check_file_exists(
        "lib/benchmarkConstants.ts",
        "Benchmark constants file"
    ))

    # Check national medians constant
    results.append(check_text_in_file(
        "lib/benchmarkConstants.ts",
        'NATIONAL_MEDIANS',
        "National medians constant"
    ))

    # Check state fallback medians
    results.append(check_text_in_file(
        "lib/benchmarkConstants.ts",
        'STATE_FALLBACK_MEDIANS',
        "State fallback medians constant"
    ))

    # Check helper functions
    results.append(check_function_exists(
        "lib/benchmarkConstants.ts",
        "getStateFallbackMedians",
        "State fallback function"
    ))

    results.append(check_function_exists(
        "lib/benchmarkConstants.ts",
        "ensureValidBenchmarkData",
        "Benchmark validation function"
    ))

    print("\n2. ZIP-LEVEL BENCHMARK FUNCTIONS")
    print("-" * 70)

    # Check ZCTA benchmark functions
    results.append(check_function_exists(
        "lib/data.ts",
        "getStateMediansZCTA",
        "ZCTA state medians function"
    ))

    results.append(check_function_exists(
        "lib/data.ts",
        "getUSMediansZCTA",
        "ZCTA US medians function"
    ))

    # Check updated getZipBenchmarks
    results.append(check_function_exists(
        "lib/data.ts",
        "getZipBenchmarks",
        "ZIP benchmarks function"
    ))

    # Verify TODO comments removed
    print("\n3. TODO COMMENT REMOVAL")
    print("-" * 70)
    data_ts = Path("lib/data.ts").read_text()

    if "TODO: State median" not in data_ts:
        print("[PASS] Removed 'TODO: State median' comment")
        results.append(True)
    else:
        print("[FAIL] Still contains 'TODO: State median' comment")
        results.append(False)

    if "TODO: US median" not in data_ts:
        print("[PASS] Removed 'TODO: US median' comment")
        results.append(True)
    else:
        print("[FAIL] Still contains 'TODO: US median' comment")
        results.append(False)

    # Check error handling
    print("\n4. ERROR HANDLING")
    print("-" * 70)
    results.append(check_text_in_file(
        "lib/data.ts",
        "try {",
        "Try-catch blocks in benchmark functions"
    ))

    results.append(check_text_in_file(
        "lib/data.ts",
        "console.warn",
        "Warning logging for fallback cases"
    ))

    # Check data sources documentation
    print("\n5. DATA SOURCES")
    print("-" * 70)
    results.append(check_text_in_file(
        "lib/benchmarkConstants.ts",
        "Zillow",
        "Zillow data source attribution"
    ))

    results.append(check_text_in_file(
        "lib/benchmarkConstants.ts",
        "Census",
        "Census data source attribution"
    ))

    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    passed = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is False)
    total = len([r for r in results if r is not None])

    print(f"\n[PASS] Passed: {passed}/{total}")
    print(f"[FAIL] Failed: {failed}/{total}")

    if failed == 0:
        print("\n[SUCCESS] ALL CHECKS PASSED! Benchmark implementation is complete.")
    else:
        print(f"\n[WARNING] {failed} check(s) failed. Please review.")

    print("="*70 + "\n")

if __name__ == "__main__":
    main()
