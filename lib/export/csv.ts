/**
 * CSV Export utilities for affordability data
 */

export interface CsvRow {
  [key: string]: string | number | null | undefined;
}

/**
 * Convert data to CSV format
 */
export function generateCsv(data: CsvRow[], filename: string): string {
  if (data.length === 0) {
    return '';
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];

      // Handle null/undefined
      if (value == null) {
        return '';
      }

      // Convert to string and escape if needed
      const stringValue = String(value);

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    });

    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Trigger CSV download in browser
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format timestamp for filename
 */
export function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}
