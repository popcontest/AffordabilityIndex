'use client';

/**
 * Bulk Export Button Component
 *
 * For exporting large datasets (e.g., all rankings for a state)
 */

import { useState } from 'react';
import { Button } from './ui/Button';

interface BulkExportButtonProps {
  geoType: 'ZCTA' | 'CITY' | 'PLACE';
  stateAbbr?: string;
  limit?: number;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BulkExportButton({
  geoType,
  stateAbbr,
  limit = 5000,
  variant = 'primary',
  size = 'md',
  className = '',
}: BulkExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBulkExport = async () => {
    try {
      setIsExporting(true);
      setProgress(10);

      // Build URL
      const params = new URLSearchParams({
        geoType,
        limit: limit.toString(),
      });

      if (stateAbbr) {
        params.set('state', stateAbbr);
      }

      setProgress(30);

      // Fetch CSV from API
      const response = await fetch(`/api/export/rankings?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      setProgress(60);

      // Get blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const filename = `${geoType.toLowerCase()}-rankings${stateAbbr ? `-${stateAbbr}` : '-all'}-${new Date().toISOString().split('T')[0]}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProgress(100);
    } catch (error) {
      console.error('Bulk export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const label = stateAbbr
    ? `Export All ${stateAbbr} ${geoType}s`
    : `Export All ${geoType}s`;

  return (
    <Button
      onClick={handleBulkExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={`${className} relative`}
    >
      {isExporting ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Exporting {progress}%
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {label}
        </>
      )}
    </Button>
  );
}
