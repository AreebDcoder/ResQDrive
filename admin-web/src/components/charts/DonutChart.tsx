import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TOOLTIP_STYLE } from './ChartContainer';

/**
 * DonutChart — distribution chart for a categorical value.
 *
 * Usage:
 *   <DonutChart data={[{ name: 'cancel', value: 5, color: '#ef4444' }, ...]} />
 *
 * The chart shows a donut (pie with inner radius) with a label per slice
 * and a legend below.
 */

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutSlice[];
  /** Height of the chart (default 240) */
  height?: number;
  /** Center label (e.g. "Total: 25") */
  centerLabel?: string;
}

export function DonutChart({ data, height = 240, centerLabel }: DonutChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400" style={{ height }}>
        No data to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={55}
          paddingAngle={2}
          label={(entry: any) => entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: any, name: any) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, name]} />
        <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Center label needs a custom overlay (Recharts doesn't support centered text in donut)
// To use it: wrap the DonutChart in a relative container + add an absolute-positioned <p>
// at the center. For now, centerLabel is exported as a string for the caller to render.
export function DonutWithCenter({ data, height = 240, centerLabel }: DonutChartProps) {
  return (
    <div className="relative" style={{ height }}>
      <DonutChart data={data} height={height} />
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{centerLabel}</p>
        </div>
      )}
    </div>
  );
}
