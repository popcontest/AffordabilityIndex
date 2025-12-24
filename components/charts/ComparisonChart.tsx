'use client';

import { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ComparisonChartProps {
  data: DataPoint[];
  dataKey?: string;
  title?: string;
  height?: number;
  colors?: string[];
  showGrid?: boolean;
  horizontal?: boolean;
  formatValue?: (value: number) => string;
}

// Move colors array outside to prevent recreation on every render
const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

/**
 * Bar chart component for comparing values across categories
 * Used for comparing affordability ratios, home values, etc.
 * Memoized to prevent unnecessary re-renders
 */
export const ComparisonChart = memo(function ComparisonChart({
  data,
  dataKey = 'value',
  title,
  height = 300,
  colors = DEFAULT_COLORS,
  showGrid = true,
  horizontal = false,
  formatValue = (value) => value.toLocaleString(),
}: ComparisonChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: horizontal ? 100 : 10, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                width={90}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                tickFormatter={formatValue}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: any) => [formatValue(Number(value)), dataKey]}
            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
          />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
