import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TOOLTIP_STYLE } from './ChartContainer';

/**
 * HistogramChart — distribution chart for a numeric value bucketed into ranges.
 *
 * Usage:
 *   <HistogramChart data={confidenceValues} buckets={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} title="Confidence distribution" />
 *
 * The chart buckets the input values into the specified ranges and shows
 * the count per bucket as a vertical bar chart.
 */

export interface HistogramChartProps {
  /** Array of numeric values to bucket */
  data: number[];
  /** Bucket boundaries (e.g. [0, 0.25, 0.5, 0.75, 1.0] creates 4 buckets: 0-0.25, 0.25-0.5, etc.) */
  buckets: number[];
  /** Label for what the values represent (e.g. "Confidence") */
  valueLabel?: string;
  /** Optional color override (defaults to primary indigo) */
  color?: string;
  /** Height of the chart in pixels (default 240) */
  height?: number;
}

const DEFAULT_COLOR = '#6366f1'; // primary-500

export function HistogramChart({
  data,
  buckets,
  valueLabel = 'Value',
  color = DEFAULT_COLOR,
  height = 240,
}: HistogramChartProps) {
  const chartData = useMemo(() => {
    const counts = buckets.slice(0, -1).map((start, i) => {
      const end = buckets[i + 1];
      const label = start === end ? `${start}` : `${start.toFixed(2)}–${end.toFixed(2)}`;
      const count = data.filter((v) => v >= start && (i === buckets.length - 2 ? v <= end : v < end)).length;
      return { label, count };
    });
    return counts;
  }, [data, buckets]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400" style={{ height }}>
        No data to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
        <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} tickMargin={8} />
        <YAxis stroke="#9ca3af" allowDecimals={false} fontSize={11} width={32} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: any) => [`${value} log${value === 1 ? '' : 's'}`, 'Count']}
          labelFormatter={(label: any) => `${valueLabel} range: ${label}`}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
