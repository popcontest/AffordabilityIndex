"""
CLI script to import cost basket data from CSV

Usage:
    python etl/import_cost_basket_cli.py --csv data/cost_basket.csv [--dry-run]
"""

import sys
import os
import argparse

# Add etl directory to path
sys.path.insert(0, os.path.dirname(__file__))

from import_cost_basket import import_cost_basket


def main():
    parser = argparse.ArgumentParser(
        description="Import cost basket data from CSV to database"
    )
    parser.add_argument(
        '--csv',
        required=True,
        help='Path to cost basket CSV file'
    )
    parser.add_argument(
        '--source',
        default='basket_stub',
        help='Provider name (default: basket_stub)'
    )
    parser.add_argument(
        '--version',
        default='2025-01',
        help='Version identifier (default: 2025-01)'
    )
    parser.add_argument(
        '--household-type',
        default='1_adult_0_kids',
        help='Household type (default: 1_adult_0_kids)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print actions without executing'
    )

    args = parser.parse_args()

    # Get DATABASE_URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    import_cost_basket(
        csv_path=args.csv,
        database_url=database_url,
        source=args.source,
        version=args.version,
        household_type=args.household_type,
        dry_run=args.dry_run
    )


if __name__ == '__main__':
    main()
