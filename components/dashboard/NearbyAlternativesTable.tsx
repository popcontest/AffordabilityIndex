'use client';

import Link from 'next/link';
import { DataTableClient, ColumnConfig } from './DataTableClient';

interface NearbyRow {
  label: string;
  href: string;
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
  asOfDate?: Date;
}

interface NearbyAlternativesTableProps {
  betterRows: NearbyRow[];
  worseRows: NearbyRow[];
}

/**
 * Table showing more/less affordable nearby alternatives (client component for Link rendering)
 */
export function NearbyAlternativesTable({ betterRows, worseRows }: NearbyAlternativesTableProps) {
  const formatCurrency = (val: number | null) => {
    if (val === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatRatio = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(2);
  };

  const columns: ColumnConfig[] = [
    {
      key: 'label',
      label: 'Location',
      align: 'left',
      format: (val, row) => (
        <Link href={row.href} className="text-blue-600 hover:underline">
          {val}
        </Link>
      ),
    },
    {
      key: 'homeValue',
      label: 'Home Value',
      align: 'right',
      format: formatCurrency,
    },
    {
      key: 'income',
      label: 'Income',
      align: 'right',
      format: formatCurrency,
    },
  ];

  return (
    <div className="space-y-6">
      {/* More Affordable Nearby */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">More Affordable Nearby</h3>
        {betterRows.length > 0 ? (
          <DataTableClient columns={columns} rows={betterRows} />
        ) : (
          <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            No more-affordable cities found in this state. This location is already among the most affordable.
          </div>
        )}
      </div>

      {/* Less Affordable Nearby */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Less Affordable Nearby</h3>
        {worseRows.length > 0 ? (
          <DataTableClient columns={columns} rows={worseRows} />
        ) : (
          <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            No less-affordable cities found in this state.
          </div>
        )}
      </div>
    </div>
  );
}
