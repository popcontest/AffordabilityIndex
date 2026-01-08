/**
 * PDF Report generation utilities
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfReportData {
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

  // Metadata
  reportDate: string;
  includeCharts?: boolean;
  includeMethodology?: boolean;
}

/**
 * Generate PDF affordability report
 */
export function generateAffordabilityReport(data: PdfReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // ============================================================================
  // HEADER
  // ============================================================================

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Affordability Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Location
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(data.locationName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${data.reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0);
  yPosition += 10;

  // Separator line
  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // ============================================================================
  // AFFORDABILITY SCORE SUMMARY
  // ============================================================================

  if (data.compositeScore !== null && data.compositeScore !== undefined) {
    checkPageBreak(40);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Affordability Score', margin, yPosition);
    yPosition += 8;

    // Score display
    const score = Math.round(data.compositeScore);
    doc.setFontSize(32);
    doc.setTextColor(
      score >= 70 ? 34 : score >= 40 ? 59 : 220,
      score >= 70 ? 139 : score >= 40 ? 130 : 53,
      score >= 70 ? 34 : score >= 40 ? 246 : 69
    );
    doc.text(`${score}/100`, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    const label = score >= 70 ? 'Highly Affordable' : score >= 40 ? 'Moderately Affordable' : 'Less Affordable';
    doc.text(label, margin, yPosition);
    yPosition += 10;
  }

  // ============================================================================
  // KEY METRICS
  // ============================================================================

  checkPageBreak(50);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Metrics', margin, yPosition);
  yPosition += 8;

  // Metrics table
  const metricsData = [
    ['Median Home Value', formatCurrency(data.homeValue)],
    ['Median Household Income', formatCurrency(data.medianIncome)],
    ['Affordability Ratio', formatRatio(data.affordabilityRatio)],
    ['Earning Power', formatPercent(data.earningPower)],
    ['Population', formatNumber(data.population)],
  ];

  if (data.requiredIncome) {
    metricsData.push(['Required Income for Home', formatCurrency(data.requiredIncome)]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: metricsData.filter(row => row[1] !== 'N/A'),
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // ============================================================================
  // SCORE BREAKDOWN
  // ============================================================================

  if (data.housingScore || data.colScore || data.taxScore) {
    checkPageBreak(40);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Score Breakdown', margin, yPosition);
    yPosition += 8;

    const scoreData = [
      ['Housing Score', data.housingScore !== null && data.housingScore !== undefined ? `${Math.round(data.housingScore)}/100` : 'N/A'],
      ['Cost of Living Score', data.colScore !== null && data.colScore !== undefined ? `${Math.round(data.colScore)}/100` : 'N/A'],
      ['Tax Burden Score', data.taxScore !== null && data.taxScore !== undefined ? `${Math.round(data.taxScore)}/100` : 'N/A'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Component', 'Score']],
      body: scoreData,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // ============================================================================
  // RANKINGS
  // ============================================================================

  if (data.nationalPercentile || data.stateRanking) {
    checkPageBreak(30);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rankings', margin, yPosition);
    yPosition += 8;

    if (data.nationalPercentile !== null && data.nationalPercentile !== undefined) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `National: ${data.nationalPercentile}th percentile (${data.nationalPercentile >= 50 ? 'More' : 'Less'} affordable than ${data.nationalPercentile >= 50 ? data.nationalPercentile : 100 - data.nationalPercentile}% of US areas)`,
        margin,
        yPosition
      );
      yPosition += 6;
    }

    if (data.stateRanking) {
      doc.text(
        `State: Ranked #${data.stateRanking.rank} of ${data.stateRanking.total} in ${data.stateAbbr || 'state'} (${data.stateRanking.percentile}th percentile)`,
        margin,
        yPosition
      );
      yPosition += 6;
    }
  }

  // ============================================================================
  // DEMOGRAPHICS
  // ============================================================================

  if (data.medianRent || data.housingBurdenPct || data.povertyRatePct) {
    checkPageBreak(40);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Demographics & Housing', margin, yPosition);
    yPosition += 8;

    const demoData = [
      ['Median Gross Rent', data.medianRent ? formatCurrency(data.medianRent) + '/mo' : 'N/A'],
      ['Housing Cost Burden', data.housingBurdenPct ? `${data.housingBurdenPct.toFixed(1)}%` : 'N/A'],
      ['Poverty Rate', data.povertyRatePct ? `${data.povertyRatePct.toFixed(1)}%` : 'N/A'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: demoData.filter(row => row[1] !== 'N/A'),
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // ============================================================================
  // DATA SOURCES
  // ============================================================================

  checkPageBreak(30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Data Sources', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  const sources = [
    data.zillowDate ? `Zillow Home Value Index (${data.zillowDate})` : null,
    data.acsVintage ? `US Census Bureau ACS ${data.acsVintage}` : null,
  ].filter(Boolean);

  sources.forEach(source => {
    if (source) {
      doc.text(`• ${source}`, margin, yPosition);
      yPosition += 5;
    }
  });

  doc.setTextColor(0);

  // ============================================================================
  // METHODOLOGY (optional)
  // ============================================================================

  if (data.includeMethodology) {
    checkPageBreak(60);

    doc.addPage();
    yPosition = margin;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Methodology', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const methodology = [
      'Affordability Ratio = Median Home Value / Median Household Income',
      '',
      'A higher ratio indicates lower affordability (homes are more expensive relative to income).',
      '',
      'Score Components:',
      '• Housing Score: Based on home value to income ratio',
      '• Cost of Living Score: Regional price parity and essential costs',
      '• Tax Burden Score: State and local tax rates',
      '',
      'Composite Score: Weighted average of component scores (0-100 scale)',
      '',
      'Data Limitations:',
      '• ZIP data uses ZCTA boundaries (may differ from USPS ZIP codes)',
      '• Income data lags home value data by 1-2 years',
      '• Small geographies have higher margins of error',
    ];

    methodology.forEach(line => {
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
  }

  // ============================================================================
  // FOOTER
  // ============================================================================

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `AffordabilityIndex.com | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Save PDF to file
 */
export function savePdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toLocaleString()}`;
}

function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString();
}

/**
 * Get timestamp for filename
 */
export function getPdfTimestamp(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}
