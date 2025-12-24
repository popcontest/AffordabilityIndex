'use client';

import { memo, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface DataPoint {
  value: number;
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Mini chart component for showing trends inline with table data
 * Displays a simple line showing the trend direction at a glance
 * Memoized to prevent re-renders and data recalculations
 */
export const Sparkline = memo(function Sparkline({
  data,
  width = 80,
  height = 30,
  color,
  trend,
}: SparklineProps) {
  // Memoize data transformation to prevent recreation on every render
  const chartData = useMemo<DataPoint[]>(
    () => data.map((value) => ({ value })),
    [data]
  );

  // Memoize trend detection
  const autoTrend = useMemo(
    () =>
      trend ||
      (data.length >= 2
        ? data[data.length - 1] > data[0]
          ? 'up'
          : data[data.length - 1] < data[0]
          ? 'down'
          : 'neutral'
        : 'neutral'),
    [data, trend]
  );

  // Memoize color calculation
  const lineColor = useMemo(
    () =>
      color ||
      (autoTrend === 'up'
        ? '#10b981' // green
        : autoTrend === 'down'
        ? '#ef4444' // red
        : '#6b7280'), // gray
    [color, autoTrend]
  );

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});
