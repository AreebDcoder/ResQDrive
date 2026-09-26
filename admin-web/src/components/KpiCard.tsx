import type { ComponentType, ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/cn';

/**
 * KpiCard — single metric tile with sparkline + trend indicator.
 *
 * Props:
 *   label     — short label (e.g. "Total Incidents")
 *   value     — primary number/string
 *   icon      — Lucide icon component (rendered with size 22)
 *   accent    — semantic color: primary/success/warning/danger/info
 *   sub       — secondary text below the value (e.g. "5 active • 12 resolved")
 *   trend     — optional { value: number (signed %), direction: 'up'|'down'|'flat' }
 *               Positive % with 'up' is good for some metrics (active users)
 *               and bad for others (false alarms). Caller decides.
 *   sparkline — optional array of { value: number } for the mini line chart
 *   onClick   — optional (makes the card a button → drill-down)
 *
 * Accessibility:
 *   - When clickable, role=button + tabIndex + Enter/Space keyboard handler
 *   - Trend arrow has aria-label describing direction
 */

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  sub?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    /** "good" or "bad" — controls color (green for good, red for bad). If omitted, neutral. */
    sentiment?: 'good' | 'bad' | 'neutral';
  };
  sparkline?: Array<{ value: number }>;
  onClick?: () => void;
  className?: string;
}

const ACCENTS: Record<NonNullable<KpiCardProps['accent']>, { icon: string; line: string }> = {
  primary: { icon: 'text-primary-600 dark:text-primary-400', line: '#6366f1' },
  success: { icon: 'text-success-600 dark:text-success-400', line: '#10b981' },
  warning: { icon: 'text-warning-600 dark:text-warning-400', line: '#f59e0b' },
  danger: { icon: 'text-danger-600 dark:text-danger-400', line: '#ef4444' },
  info: { icon: 'text-info-600 dark:text-info-400', line: '#0ea5e9' },
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'primary',
  sub,
  trend,
  sparkline,
  onClick,
  className,
}: KpiCardProps) {
  const colors = ACCENTS[accent];
  const clickable = Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const TrendIcon = trend?.direction === 'up' ? TrendingUp
    : trend?.direction === 'down' ? TrendingDown
    : Minus;
  const trendColor =
    trend?.sentiment === 'good' ? 'text-success-600 dark:text-success-400'
    : trend?.sentiment === 'bad' ? 'text-danger-600 dark:text-danger-400'
    : 'text-gray-500 dark:text-gray-400';

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all',
        'border-gray-200 dark:border-gray-800 dark:bg-gray-900',
        clickable && 'cursor-pointer hover:shadow-md hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:border-primary-700',
        className,
      )}
    >
      {/* Left accent bar */}
      <div className={cn('absolute left-0 top-0 h-full w-1', `bg-${accent}-500`)} aria-hidden />

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && (
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{sub}</p>
          )}
        </div>
        <Icon size={22} className={cn('shrink-0', colors.icon)} aria-hidden />
      </div>

      {(trend || sparkline) && (
        <div className="mt-3 flex items-end justify-between gap-3">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                trendColor,
              )}
              aria-label={`Trend ${trend.direction} by ${Math.abs(trend.value)} percent`}
            >
              <TrendIcon size={14} aria-hidden />
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
          )}
          {sparkline && sparkline.length > 1 && (
            <div className="h-8 flex-1 max-w-[100px]" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkline}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.line}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
