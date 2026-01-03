interface SourcesFooterProps {
  zillowDate?: Date;
  acsVintage?: string;
  isZCTA?: boolean;
}

/**
 * Footer displaying data sources and ZCTA disclaimer
 */
export function SourcesFooter({ zillowDate, acsVintage, isZCTA }: SourcesFooterProps) {
  const zillowDateStr = zillowDate
    ? zillowDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recent';

  // Default to ACS 2018-2022 5-Year Estimates if not provided
  const acsVintageStr = acsVintage || 'ACS 2018-2022 5-Year Estimates';

  return (
    <div className="space-y-3 text-xs text-gray-600">
      <div>
        <strong>Data Sources:</strong>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>
            Home values: Zillow Home Value Index (ZHVI) as of {zillowDateStr} (
            <a
              href="https://www.zillow.com/research/data/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              zillow.com/research/data/
            </a>
            )
          </li>
          <li>
            Income: US Census Bureau {acsVintageStr}
          </li>
        </ul>
      </div>

      {isZCTA && (
        <div className="border-t border-gray-200 pt-3">
          <strong>Note:</strong> ZIP Code Tabulation Areas (ZCTAs) are generalized areal representations
          created by the US Census Bureau for statistical purposes. ZCTA boundaries may differ from USPS
          ZIP code delivery areas.{' '}
          <a
            href="https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Learn more
          </a>
        </div>
      )}
    </div>
  );
}
