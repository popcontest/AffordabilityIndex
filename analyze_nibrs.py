#!/usr/bin/env python3
"""
Analyze NIBRS 2024 Data - Extract County-Level Crime Statistics

NIBRS uses fixed-width format with multiple record types:
- BH: Batch Header
- 01: Administrative Segment (agency info)
- 02: Offense Segment
- 03: Property Segment
- 04: Victim Segment
- 05: Offender Segment
- 06: Arrestee Segment
- 07: Group B Arrest Report
"""

import re
import zipfile
from collections import defaultdict
import os

NIBRS_ZIP = r"Z:\Downloads\nibrs-2024.zip"
NIBRS_FILE = "2024_NIBRS_NATIONAL_MASTER_FILE.txt"

# NIBRS record types
BATCH_HEADER = "BH"
ADMIN_SEGMENT = "01"
OFFENSE_SEGMENT = "02"
PROPERTY_SEGMENT = "03"
VICTIM_SEGMENT = "04"
OFFENDER_SEGMENT = "05"
ARRESTEE_SEGMENT = "06"
GROUP_B_ARREST = "07"

# UCR offense codes for violent crimes
VIOLENT_CRIMES = {
    '09A',  # Murder
    '09B',  # Negligent Manslaughter
    '11A',  # Rape
    '11B',  # Sodomy
    '11C',  # Sexual Assault with Object
    '11D',  # Fondling
    '120',  # Robbery
    '13A',  # Aggravated Assault
    '13B',  # Simple Assault
}

# Property crimes
PROPERTY_CRIMES = {
    '200',  # Arson
    '210',  # Extortion/Blackmail
    '220',  # Burglary/Breaking & Entering
    '23A',  # Pocket-picking
    '23B',  # Purse-snatching
    '23C',  # Shoplifting
    '23D',  # Theft From Building
    '23E',  # Theft From Coin-Operated Machine
    '23F',  # Theft From Motor Vehicle
    '23G',  # Theft of Motor Vehicle Parts
    '23H',  # All Other Larceny
    '240',  # Motor Vehicle Theft
    '250',  # Counterfeiting/Forgery
    '26A',  # False Pretenses/Swindle/Confidence Game
    '26B',  # Credit Card/ATM Fraud
    '26C',  # Impersonation
    '26D',  # Welfare Fraud
    '26E',  # Wire Fraud
    '270',  # Embezzlement
    '280',  # Stolen Property Offenses
    '290',  # Destruction/Damage/Vandalism
}

def parse_batch_header(line):
    """Parse BH record to extract ORI (Originating Agency Identifier)"""
    # BH format: positions 1-2 = "BH", 3-4 = state code, etc.
    if len(line) < 50:
        return None

    record_type = line[0:2]
    state_code = line[2:4]
    ori = line[4:13].strip()  # ORI is 9 characters

    return {
        'state': state_code,
        'ori': ori
    }

def parse_offense_segment(line):
    """Parse 02 record to extract offense information"""
    if len(line) < 50:
        return None

    record_type = line[0:2]
    ori = line[2:11].strip()
    incident_number = line[11:23].strip()

    # UCR offense code is typically at position 24-26
    ucr_code = line[23:26].strip()

    return {
        'ori': ori,
        'incident': incident_number,
        'ucr_code': ucr_code
    }

def analyze_nibrs_sample(sample_size=100000):
    """Analyze first N lines to understand structure"""

    print("=" * 60)
    print("NIBRS 2024 Data Analysis")
    print("=" * 60)

    record_counts = defaultdict(int)
    agencies = set()
    states = set()
    offenses = defaultdict(int)

    print(f"\nAnalyzing first {sample_size:,} lines...")

    with zipfile.ZipFile(NIBRS_ZIP, 'r') as zf:
        with zf.open(NIBRS_FILE) as f:
            for i, line in enumerate(f):
                if i >= sample_size:
                    break

                line_str = line.decode('utf-8', errors='ignore')

                if len(line_str) < 2:
                    continue

                record_type = line_str[0:2]
                record_counts[record_type] += 1

                # Parse different record types
                if record_type == BATCH_HEADER:
                    header = parse_batch_header(line_str)
                    if header:
                        agencies.add(header['ori'])
                        states.add(header['state'])

                elif record_type == OFFENSE_SEGMENT:
                    offense = parse_offense_segment(line_str)
                    if offense and offense['ucr_code']:
                        offenses[offense['ucr_code']] += 1

                if (i + 1) % 10000 == 0:
                    print(f"  Processed {i+1:,} lines...")

    # Display results
    print(f"\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    print(f"\nRecord Type Counts:")
    for rec_type in sorted(record_counts.keys()):
        count = record_counts[rec_type]
        type_name = {
            'BH': 'Batch Header',
            '01': 'Administrative',
            '02': 'Offense',
            '03': 'Property',
            '04': 'Victim',
            '05': 'Offender',
            '06': 'Arrestee',
            '07': 'Group B Arrest',
        }.get(rec_type, f'Unknown ({rec_type})')
        print(f"  {rec_type} ({type_name:20s}): {count:8,}")

    print(f"\nAgencies Found: {len(agencies):,}")
    print(f"States Found: {len(states)} - {sorted(states)}")

    print(f"\nTop 20 Offense Codes:")
    for code, count in sorted(offenses.items(), key=lambda x: x[1], reverse=True)[:20]:
        crime_type = "VIOLENT" if code in VIOLENT_CRIMES else "PROPERTY" if code in PROPERTY_CRIMES else "OTHER"
        print(f"  {code}: {count:6,} ({crime_type})")

    # Calculate violent vs property
    violent_count = sum(count for code, count in offenses.items() if code in VIOLENT_CRIMES)
    property_count = sum(count for code, count in offenses.items() if code in PROPERTY_CRIMES)
    total_offenses = sum(offenses.values())

    print(f"\nCrime Type Summary:")
    print(f"  Violent Crimes:  {violent_count:8,} ({100*violent_count/total_offenses:.1f}%)")
    print(f"  Property Crimes: {property_count:8,} ({100*property_count/total_offenses:.1f}%)")
    print(f"  Other Crimes:    {total_offenses - violent_count - property_count:8,}")

    print(f"\n" + "=" * 60)
    print("ASSESSMENT")
    print("=" * 60)

    print("\nFeasibility for Affordability Index:")
    print("  1. Data Format: Fixed-width, requires custom parser")
    print("  2. Aggregation: Need to group incidents by agency → county")
    print("  3. ORI-to-County Mapping: Requires FBI's agency crosswalk file")
    print("  4. Coverage: ~33% of agencies (not nationally representative)")
    print("  5. Processing Time: Estimated 30-60 minutes for full file")

    print("\nRecommendation:")
    print("  Jacob Kaplan's County-Level UCR data is preferable because:")
    print("  - Already aggregated to county level")
    print("  - CSV format (easy to parse)")
    print("  - Better coverage (UCR includes NIBRS + summary data)")
    print("  - Pre-calculated rates per 100k")
    print("  - No ORI-to-county mapping needed")

    print("\nIf you prefer NIBRS data:")
    print("  - Need FBI's 'Agency Crosswalk' file (ORI → County FIPS)")
    print("  - Will write full parser to aggregate incidents by county")
    print("  - Result will have gaps (only ~33% coverage)")

if __name__ == '__main__':
    analyze_nibrs_sample(100000)
