# Export Functionality Documentation

## Overview

The Affordability Index now includes comprehensive export functionality for both individual location data and bulk rankings. Users can export data as CSV files or generate professional PDF reports.

## Features

### 1. CSV Export

#### Individual Location Export
- **Location**: Each ZIP/city page has export buttons in the header
- **Data Included**:
  - Location metadata (name, type, state)
  - Key metrics (home value, income, affordability ratio)
  - V2 scores (housing, COL, tax, composite)
  - Required income calculations
  - Rankings (national and state)
  - ACS demographic data
  - Benchmark comparisons
  - Data vintages and timestamps

#### Bulk Rankings Export
- **API Endpoint**: `GET /api/export/rankings`
- **Query Parameters**:
  - `geoType`: 'ZCTA' | 'CITY' | 'PLACE' (default: 'ZCTA')
  - `state`: State abbreviation (optional)
  - `limit`: Maximum records to return (default: 1000)
  - `offset`: Pagination offset (default: 0)

**Example Requests**:
```bash
# Export all ZIP codes
curl "http://localhost:3000/api/export/rankings?geoType=ZCTA&limit=5000" -o rankings.csv

# Export all California ZIPs
curl "http://localhost:3000/api/export/rankings?geoType=ZCTA&state=CA&limit=10000" -o ca-zips.csv

# Export all cities
curl "http://localhost:3000/api/export/rankings?geoType=CITY&limit=5000" -o cities.csv
```

### 2. PDF Report Generation

#### Features
- **Professional Layout**: Clean, branded PDF reports with proper formatting
- **Multi-page**: Automatically handles page breaks
- **Color-coded**: Scores use color coding (green/blue/yellow/red)
- **Tables**: Auto-generated tables for metrics and breakdowns
- **Data Sources**: Includes methodology and data attribution
- **Customizable**: Optional methodology section

#### Report Sections
1. **Header**: Location name, type, and report date
2. **Affordability Score**: Large composite score display with color coding
3. **Key Metrics**: Home value, income, ratio, earning power, population
4. **Score Breakdown**: Housing, COL, and tax component scores
5. **Rankings**: National and state rankings with percentiles
6. **Demographics**: ACS housing and economic data
7. **Data Sources**: Attribution with data vintages
8. **Methodology** (optional): Detailed methodology explanation

## Components

### ExportButton Component

Location: `C:\code\websites\AffordabilityIndex\components\ExportButton.tsx`

**Props**:
```typescript
interface ExportButtonProps {
  // Location info
  locationName: string;
  locationType: 'ZIP' | 'City' | 'Place';
  locationId: string;
  stateAbbr?: string;

  // Metrics
  homeValue?: number | null;
  medianIncome?: number | null;
  affordabilityRatio?: number | null;
  earningPower?: number | null;
  population?: number | null;

  // V2 Scores
  compositeScore?: number | null;
  housingScore?: number | null;
  colScore?: number | null;
  taxScore?: number | null;

  // Required income
  requiredIncome?: number | null;

  // Rankings
  nationalPercentile?: number | null;
  stateRanking?: {
    rank: number;
    total: number;
    percentile: number;
  } | null;

  // ACS Demographics
  medianRent?: number | null;
  housingBurdenPct?: number | null;
  povertyRatePct?: number | null;

  // Data vintages
  zillowDate?: string | null;
  acsVintage?: string | null;

  // Benchmarks for CSV
  benchmarks?: Array<{
    name: string;
    homeValue?: number | null;
    income?: number | null;
    ratio?: number | null;
  }>;

  // Customization
  includeMethodology?: boolean;

  // Button styling
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Usage Example**:
```tsx
import { ExportButton } from '@/components/ExportButton';

<ExportButton
  locationName="San Francisco, CA"
  locationType="City"
  locationId="0667000"
  stateAbbr="CA"
  homeValue={1250000}
  medianIncome={125000}
  affordabilityRatio={10.0}
  compositeScore={25}
  housingScore={20}
  colScore={30}
  taxScore={40}
  requiredIncome={250000}
  nationalPercentile={10}
  stateRanking={{ rank: 450, total: 482, percentile: 7 }}
  medianRent={2500}
  housingBurdenPct={35}
  povertyRatePct={12}
  zillowDate="2025-01-31"
  acsVintage="2018-2022"
  benchmarks={benchmarksData}
  includeMethodology={true}
  variant="secondary"
  size="md"
/>
```

### BulkExportButton Component

Location: `C:\code\websites\AffordabilityIndex\components\BulkExportButton.tsx`

**Props**:
```typescript
interface BulkExportButtonProps {
  geoType: 'ZCTA' | 'CITY' | 'PLACE';
  stateAbbr?: string;
  limit?: number;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Usage Example**:
```tsx
import { BulkExportButton } from '@/components/BulkExportButton';

// Export all California ZIPs
<BulkExportButton
  geoType="ZCTA"
  stateAbbr="CA"
  limit={10000}
  variant="primary"
/>

// Export all cities
<BulkExportButton
  geoType="CITY"
  limit={5000}
  variant="secondary"
/>
```

## Utilities

### CSV Generation

Location: `C:\code\websites\AffordabilityIndex\lib\export\csv.ts`

**Functions**:
```typescript
// Convert data array to CSV string
generateCsv(data: CsvRow[], filename: string): string

// Trigger CSV download in browser
downloadCsv(csvContent: string, filename: string): void

// Get timestamp for filename
getTimestamp(): string // Returns "YYYY-MM-DD"
```

**Usage Example**:
```typescript
import { generateCsv, downloadCsv, getTimestamp } from '@/lib/export';

const data = [
  { name: 'San Francisco', homeValue: 1250000, income: 125000 },
  { name: 'Oakland', homeValue: 850000, income: 95000 },
];

const csv = generateCsv(data, 'my-data');
downloadCsv(csv, `export-${getTimestamp()}.csv`);
```

### PDF Generation

Location: `C:\code\websites\AffordabilityIndex\lib\export\pdf.ts`

**Functions**:
```typescript
// Generate PDF report
generateAffordabilityReport(data: PdfReportData): jsPDF

// Save PDF to file
savePdf(doc: jsPDF, filename: string): void

// Get timestamp for filename
getPdfTimestamp(): string // Returns "YYYY-MM-DD"
```

**Usage Example**:
```typescript
import { generateAffordabilityReport, savePdf, getPdfTimestamp } from '@/lib/export/pdf';

const reportData = {
  locationName: 'San Francisco, CA',
  locationType: 'City',
  locationId: '0667000',
  stateAbbr: 'CA',
  homeValue: 1250000,
  medianIncome: 125000,
  affordabilityRatio: 10.0,
  // ... other fields
};

const doc = generateAffordabilityReport(reportData);
savePdf(doc, `report-${getPdfTimestamp()}.pdf`);
```

## File Structure

```
lib/export/
├── index.ts          # Main exports
├── csv.ts            # CSV generation utilities
└── pdf.ts            # PDF generation utilities

components/
├── ExportButton.tsx  # Individual location export button
├── BulkExportButton.tsx  # Bulk export button
└── ui/
    └── Button.tsx    # Reusable button component

app/api/export/
└── rankings/
    └── route.ts      # API endpoint for bulk rankings export
```

## Integration Example

### Adding Export to a City Page

```tsx
import { ExportButton } from '@/components/ExportButton';

// In your page component
export default async function CityPage({ params }) {
  const cityData = await getCityDashboardData(params.place);
  const v2Score = await getV2Score('PLACE', params.place);
  const acsData = await getAcsSnapshot('PLACE', params.place);
  const requiredIncome = await calculateRequiredIncome('PLACE', params.place);

  const heroScore = buildV2ScoreBreakdown(v2Score);

  return (
    <DashboardShell
      header={
        <div className="flex items-center justify-between">
          <Toolbar lastUpdated={cityData.metrics?.asOfDate} />
          <ExportButton
            locationName={`${cityData.city.name}, ${cityData.city.stateAbbr}`}
            locationType="Place"
            locationId={params.place}
            stateAbbr={cityData.city.stateAbbr}
            homeValue={cityData.metrics?.homeValue}
            medianIncome={cityData.metrics?.income}
            affordabilityRatio={cityData.metrics?.ratio}
            compositeScore={heroScore.overallScore}
            housingScore={heroScore.housingScore}
            colScore={heroScore.essentialsScore}
            taxScore={heroScore.taxesScore}
            requiredIncome={requiredIncome?.requiredAnnualIncome}
            zillowDate={cityData.metrics?.asOfDate?.toISOString()}
            acsVintage={acsData?.vintage}
            benchmarks={cityData.benchmarks}
            includeMethodology={true}
          />
        </div>
      }
    >
      {/* Page content */}
    </DashboardShell>
  );
}
```

## Data Attribution

Exported reports automatically include proper data attribution:

- **Home value data**: Zillow Research (zillow.com/research/data/)
- **Income data**: US Census Bureau, American Community Survey
- **Data vintage**: Automatically included from source data

## Customization

### Customizing PDF Reports

You can customize the PDF generation by modifying `lib/export/pdf.ts`:

1. **Colors**: Change color schemes for score displays
2. **Layout**: Adjust margins, fonts, and spacing
3. **Sections**: Add or remove report sections
4. **Branding**: Add logos or custom headers

### Customizing CSV Format

Modify `lib/export/csv.ts` to adjust:

1. **Delimiter**: Change from comma to tab or pipe
2. **Date format**: Adjust timestamp format
3. **Escape handling**: Modify quote/escape behavior
4. **Headers**: Customize column headers

## Dependencies

```json
{
  "dependencies": {
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.4",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.8"
  }
}
```

## Browser Support

- **CSV Export**: All modern browsers
- **PDF Export**: All modern browsers with ES6+ support
- **File Download**: Uses Blob and URL.createObjectURL (widely supported)

## Performance Considerations

### Client-side Export
- Individual location exports are fast (<1 second)
- PDF generation uses jsPDF on the client
- No server load for individual exports

### Server-side Export
- Bulk exports use API endpoint for efficient database queries
- Streaming response for large datasets
- Configurable limits to prevent memory issues

## Future Enhancements

Potential improvements:

1. **Excel Export**: Native .xlsx format with formatting
2. **Charts**: Add visualizations to PDF reports
3. **Scheduled Reports**: Email reports on schedule
4. **Custom Templates**: User-defined report templates
5. **Batch Download**: Download multiple locations at once
6. **API Authentication**: Rate-limited access for bulk exports

## Testing

Manual testing checklist:

- [ ] CSV export for individual ZIP
- [ ] CSV export for individual city
- [ ] PDF export for individual location
- [ ] Bulk CSV export (all ZIPs)
- [ ] Bulk CSV export (state-filtered)
- [ ] PDF contains all sections
- [ ] Timestamps in filenames
- [ ] Data attribution included
- [ ] Loading states during export
- [ ] Error handling for failures
