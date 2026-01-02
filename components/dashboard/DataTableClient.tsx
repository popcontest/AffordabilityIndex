'use client';

import React, { useState, useMemo } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: any, row: Record<string, any>) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableClientProps {
  columns: ColumnConfig[];
  rows: Record<string, any>[];
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
}

/**
 * Generic sortable table with minimal design (client component for interactivity)
 */
export function DataTableClient({
  columns,
  rows,
  defaultSortKey,
  defaultSortDir = 'asc',
}: DataTableClientProps) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Memoize sorting to prevent recalculation on every render
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`py-2 px-3 font-medium text-gray-700 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                <div className={`flex items-center gap-1 ${
                  col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                }`}>
                  <span>{col.label}</span>
                  {col.sortable !== false && sortKey === col.key && (
                    <span className="text-xs" aria-label={sortDir === 'asc' ? 'sorted ascending' : 'sorted descending'}>
                      {sortDir === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2 px-3 text-gray-900 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.format ? col.format(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-400 italic">
          No data available
        </div>
      )}
    </div>
  );
}
