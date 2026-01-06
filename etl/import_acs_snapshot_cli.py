"""
ACS Snapshot Import CLI

Command-line interface for importing ACS demographic data.

Usage:
    # Dry run (test without importing)
    python import_acs_snapshot_cli.py --dry-run --limit 10

    # Import 100 ZCTAs for testing
    python import_acs_snapshot_cli.py --limit 100

    # Import all ZCTAs (will take several hours)
    python import_acs_snapshot_cli.py

    # Resume from offset (if previous run failed)
    python import_acs_snapshot_cli.py --offset 5000

    # Use with nohup for long-running import
    nohup python import_acs_snapshot_cli.py > acs_import.log 2>&1 &
"""

import argparse
import sys
import config
from import_acs_snapshot import import_acs_for_zctas


def main():
    parser = argparse.ArgumentParser(
        description='Import ACS demographic data for ZCTAs',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of ZCTAs to process (useful for testing)',
        default=None
    )

    parser.add_argument(
        '--offset',
        type=int,
        help='Skip first N ZCTAs (useful for resuming)',
        default=0
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print actions without executing database operations'
    )

    args = parser.parse_args()

    # Validate database URL
    if not config.DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL in your .env file")
        sys.exit(1)

    # Get Census API key (optional but recommended)
    api_key = config.CENSUS_API_KEY
    if not api_key:
        print("WARNING: CENSUS_API_KEY not set. API rate limits will be lower.")
        print("Get a free key at: https://api.census.gov/data/key_signup.html")
        print()

    # Run import
    try:
        import_acs_for_zctas(
            database_url=config.DATABASE_URL,
            limit=args.limit,
            start_offset=args.offset,
            dry_run=args.dry_run,
            api_key=api_key
        )
    except KeyboardInterrupt:
        print("\n\nImport interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
