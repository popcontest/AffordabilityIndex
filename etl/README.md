# ETL Pipeline - Affordability Index 2.0

**Created:** December 22-23, 2025 (Autonomous overnight implementation)
**Purpose:** Import comprehensive affordability data from 12+ government sources

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run Phase 1 (Enhanced Housing)
python etl/phase1_housing/import_hud_fmr.py
python etl/phase1_housing/import_fhfa_hpi.py  
python etl/phase1_housing/import_property_tax.py
```

## Directory Structure

- `utils/` - Shared database, mapping, and validation utilities
- `phase1_housing/` - HUD FMR, FHFA HPI, Property Tax
- `phase2_critical/` - Childcare, Insurance, Sales Tax
- `phase3_regional/` - Food, Healthcare, Income Tax
- `composite/` - Calculate True Affordability Score
- `logs/` - ETL execution logs

## Documentation

See individual script headers for detailed usage instructions.

All scripts support `--dry-run` mode for testing without database writes.

**Status:** Infrastructure complete, ready for execution
