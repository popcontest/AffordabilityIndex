# Crime Data Import Guide

## Data Sources for Crime Statistics

### Recommended Approach: Jacob Kaplan's County-Level UCR Data

**Best option for our needs**: County-level aggregated crime data

####Step 1: Register and Download
1. Visit: https://www.openicpsr.org/openicpsr/project/108164
2. Create free account (academic/research use)
3. Download: **County-Level Detailed Arrest and Offense Data**
4. Files available in multiple formats:
   - CSV (recommended)
   - Parquet (faster for large files)
   - RData/Stata

#### Step 2: What You'll Get
- County-level crime rates (violent + property)
- Coverage: 1974-2020+ (check latest version)
- Pre-aggregated from agency-level data
- Includes:
  - Violent crime rate (per 100k)
  - Property crime rate (per 100k)
  - Murder, rape, robbery, aggravated assault
  - Burglary, larceny, motor vehicle theft

#### Step 3: Save Location
Save downloaded CSV as:
```
C:\code\websites\AffordabilityIndex\fbi_county_crime_data.csv
```

Then run:
```bash
python import_crime_rates.py
```

---

## Alternative: FBI Crime Data Explorer API

**Requires API key** - Good for automated updates

### Setup
1. Request API key (may take days): https://api.data.gov/signup/
2. Set environment variable:
   ```bash
   set FBI_API_KEY=your_key_here
   ```

### API Endpoints
```
# Get state estimates
GET https://api.usa.gov/crime/fbi/cde/estimate/state?API_KEY={key}&from=2020&to=2023

# Get agency data
GET https://api.usa.gov/crime/fbi/cde/agency/{ori}/offense/{year}
```

### Issues with API Approach
- Requires mapping agencies → counties (complex)
- Not all agencies report all 12 months
- Coverage gaps in rural areas
- API rate limits

---

## Alternative: Manual Download from FBI CDE

1. Visit: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/explorer/crime/crime-trend
2. Select geography, years, crime types
3. Download table as CSV
4. Aggregate manually by county

**Cons**: Manual process, limited to current year, no historical bulk download

---

## Recommended Data Fields

For our affordability index, we need:

```csv
county_fips,year,violent_crime_rate,property_crime_rate,total_crime_rate
06037,2023,512.3,2341.8,2854.1
```

Where:
- `violent_crime_rate`: Violent crimes per 100,000 residents
- `property_crime_rate`: Property crimes per 100,000 residents
- Calculated from: (Total offenses ÷ Population) × 100,000

---

## Alternative: State-Level Crime Estimates

**Fallback option** if county data unavailable:

Download FBI's state estimates:
```
https://cde.ucr.cjis.gov/LATEST/resources/reports/UCR Summary of Reported Crimes in the Nation 2024.pdf
```

Then manually map state rates to all counties in that state (less accurate).

---

## What the Import Script Expects

The script `import_crime_rates.py` expects CSV with these columns:

### Jacob Kaplan Format (County-Level UCR):
- `fips` or `county_fips`: 5-digit FIPS code
- `year`: Year of data
- `violent_crime_total` or `violent_crime_rate`: Violent crimes or rate
- `property_crime_total` or `property_crime_rate`: Property crimes or rate
- `population`: County population (for rate calculation if needed)

### FBI CDE Export Format:
- Will auto-detect and map common column names
- Supports: "County", "FIPS", "Violent Crime Rate", etc.

---

## NIBRS 2024 Data Analysis Results

**File Provided**: `Z:\Downloads\nibrs-2024.zip` (6GB uncompressed)

**Format**: FBI NIBRS fixed-width flat file
- Multiple record types (BH, 01-07)
- Incident-level data (not aggregated)
- Coverage: ~33% of US agencies (NOT nationally representative)

**Issues Identified**:
1. **Complex Fixed-Width Format**: Requires FBI's NIBRS specification document to parse correctly (58+ data elements across 6 segments)
2. **No County Identifier**: Records contain ORI (agency code), not county FIPS. Requires separate ORI-to-County crosswalk file.
3. **Limited Coverage**: Only ~33% of agencies report via NIBRS (2024)
4. **Aggregation Required**: Must process millions of incidents to aggregate by county
5. **Processing Time**: Estimated 1-2 hours for full file parsing + aggregation

**Verdict**: NOT RECOMMENDED for Affordability Index

## Current Status

**RECOMMENDED ACTION**:
1. Register at openICPSR.org (free for research/academic use)
2. Download Jacob Kaplan's County-Level UCR data
3. Save as `fbi_county_crime_data.csv`
4. Run `python import_crime_rates.py`

**Why Jacob Kaplan's Data is Better**:
- Already aggregated to county level (no processing needed)
- CSV format (easy to parse)
- Better coverage: UCR Summary + NIBRS combined (~90% coverage)
- Pre-calculated rates per 100,000 population
- Direct county FIPS mapping (no crosswalk needed)
- Historical data: 1974-2020+
- Used by researchers and academics nationwide

**Estimated Time**: 15 minutes (registration) + 5 minutes (download) + 5 minutes (import) = 25 minutes total

---

## Cite Crime Data

When using crime data in the application:

**Attribution**:
```
Crime data: FBI Uniform Crime Reporting (UCR) Program
Data compiled by Jacob Kaplan's Concatenated Files
Source: openICPSR.org/openicpsr/project/108164
```

---

## Update Cadence

- FBI UCR data: Annual release (typically September for prior year)
- Update frequency for our app: Annually
- Automation: Manual download, automated import

