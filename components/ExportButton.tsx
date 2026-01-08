'use client';

/**
 * Export Button Component
 *
 * Provides CSV and PDF export functionality with loading states
 */

import { useState } from 'react';
import { Button } from './ui/Button';
import { generateCsv, downloadCsv, getTimestamp } from '@/lib/export';
import type { PdfReportData } from '@/lib/export/pdf';

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

  // Affordability Scores
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

export function ExportButton({
  locationName,
  locationType,
  locationId,
  stateAbbr,
  homeValue,
  medianIncome,
  affordabilityRatio,
  earningPower,
  population,
  compositeScore,
  housingScore,
  colScore,
  taxScore,
  requiredIncome,
  nationalPercentile,
  stateRanking,
  medianRent,
  housingBurdenPct,
  povertyRatePct,
  zillowDate,
  acsVintage,
  benchmarks = [],
  includeMethodology = true,
  variant = 'secondary',
  size = 'md',
  className = '',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'pdf' | null>(null);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      setExportType('csv');

      // Prepare CSV data
      const csvData = [
        {
          'Location': locationName,
          'Type': locationType,
          'ID': locationId,
          'State': stateAbbr || 'N/A',
          'Median Home Value': homeValue || 'N/A',
          'Median Household Income': medianIncome || 'N/A',
          'Affordability Ratio': affordabilityRatio?.toFixed(1) || 'N/A',
          'Earning Power': earningPower?.toFixed(4) || 'N/A',
          'Population': population || 'N/A',
          'Composite Score': compositeScore?.toFixed(1) || 'N/A',
          'Housing Score': housingScore?.toFixed(1) || 'N/A',
          'Cost of Living Score': colScore?.toFixed(1) || 'N/A',
          'Tax Score': taxScore?.toFixed(1) || 'N/A',
          'Required Income': requiredIncome || 'N/A',
          'National Percentile': nationalPercentile || 'N/A',
          'State Rank': stateRanking?.rank || 'N/A',
          'Median Rent': medianRent || 'N/A',
          'Housing Burden %': housingBurdenPct?.toFixed(1) || 'N/A',
          'Poverty Rate %': povertyRatePct?.toFixed(1) || 'N/A',
          'Zillow Data Date': zillowDate || 'N/A',
          'ACS Vintage': acsVintage || 'N/A',
          'Export Date': new Date().toISOString(),
        },
        ...benchmarks.map(b => ({
          'Location': b.name,
          'Type': 'Benchmark',
          'ID': 'N/A',
          'State': 'N/A',
          'Median Home Value': b.homeValue || 'N/A',
          'Median Household Income': b.income || 'N/A',
          'Affordability Ratio': b.ratio?.toFixed(1) || 'N/A',
          'Earning Power': 'N/A',
          'Population': 'N/A',
          'Composite Score': 'N/A',
          'Housing Score': 'N/A',
          'Cost of Living Score': 'N/A',
          'Tax Score': 'N/A',
          'Required Income': 'N/A',
          'National Percentile': 'N/A',
          'State Rank': 'N/A',
          'Median Rent': 'N/A',
          'Housing Burden %': 'N/A',
          'Poverty Rate %': 'N/A',
          'Zillow Data Date': 'N/A',
          'ACS Vintage': 'N/A',
          'Export Date': new Date().toISOString(),
        })),
      ];

      const csv = generateCsv(csvData, 'affordability-data');
      const filename = `${locationType.toLowerCase()}-${locationId}-affordability-${getTimestamp()}.csv`;
      downloadCsv(csv, filename);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setExportType('pdf');

      // Dynamic import to avoid SSR issues
      const { generateAffordabilityReport, savePdf } = await import('@/lib/export/pdf');

      const reportData: PdfReportData = {
        locationName,
        locationType,
        locationId,
        stateAbbr,
        homeValue,
        medianIncome,
        affordabilityRatio,
        earningPower,
        population,
        compositeScore,
        housingScore,
        colScore,
        taxScore,
        requiredIncome,
        nationalPercentile,
        stateRanking,
        medianRent,
        housingBurdenPct,
        povertyRatePct,
        zillowDate,
        acsVintage,
        reportDate: new Date().toLocaleDateString(),
        includeMethodology,
      };

      const doc = generateAffordabilityReport(reportData);
      const filename = `${locationType.toLowerCase()}-${locationId}-report-${getTimestamp()}.pdf`;
      savePdf(doc, filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={handleExportCsv}
        disabled={isExporting}
        variant={variant}
        size={size}
        className="relative"
      >
        {isExporting && exportType === 'csv' ? (
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
            Exporting CSV...
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </>
        )}
      </Button>

      <Button
        onClick={handleExportPdf}
        disabled={isExporting}
        variant={variant}
        size={size}
        className="relative"
      >
        {isExporting && exportType === 'pdf' ? (
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
            Generating PDF...
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Export PDF
          </>
        )}
      </Button>
    </div>
  );
}
