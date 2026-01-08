interface DataSourceBadgeProps {
  variant?: 'horizontal' | 'vertical';
  zillowDate?: Date;
  acsVintage?: string;
  showUpdateFrequency?: boolean;
}

/**
 * Reusable data source badge with consistent attribution format
 * Displays both data sources and vintages in a compact, prominent format
 */
export function DataSourceBadge({
  variant = 'horizontal',
  zillowDate,
  acsVintage,
  showUpdateFrequency = true,
}: DataSourceBadgeProps) {
  const zillowDateStr = zillowDate
    ? zillowDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Current';

  const acsVintageStr = acsVintage || 'ACS 2018-2022';

  if (variant === 'vertical') {
    return (
      <div className="inline-flex flex-col gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <div className="text-left">
            <p className="text-xs font-medium text-gray-900">Home values: Zillow ZHVI</p>
            <p className="text-xs text-gray-600">{zillowDateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="text-left">
            <p className="text-xs font-medium text-gray-900">Income: US Census ACS</p>
            <p className="text-xs text-gray-600">{acsVintageStr} 5-Year</p>
          </div>
        </div>
        {showUpdateFrequency && (
          <div className="pt-1 border-t border-gray-200">
            <p className="text-xs text-gray-500">Updated monthly + annually</p>
          </div>
        )}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <div>
          <p className="text-xs font-medium text-gray-900">Home values: Zillow ZHVI</p>
          <p className="text-xs text-gray-600">{zillowDateStr}</p>
        </div>
      </div>
      <div className="w-px h-8 bg-gray-300"></div>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div>
          <p className="text-xs font-medium text-gray-900">Income: US Census ACS</p>
          <p className="text-xs text-gray-600">{acsVintageStr} 5-Year</p>
        </div>
      </div>
      {showUpdateFrequency && (
        <>
          <div className="w-px h-8 bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">Monthly + Annual updates</span>
          </div>
        </>
      )}
    </div>
  );
}
