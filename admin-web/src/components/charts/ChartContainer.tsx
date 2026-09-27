import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { BarChart3 } from 'lucide-react';

/**
 * ChartContainer — shared wrapper for all dashboard charts.
 *
 * Provides:
 *   - Card chrome (title + optional description + optional action)
 *   - Loading skeleton (animated gray block matching chart height)
 *   - Empty state (icon + "No data" message)
 *   - Error state (with optional retry)
 *   - Theme-aware tooltip style as a shared constant (export TOOLTIP_STYLE)
 *
 * Usage:
 *   <ChartContainer title="Severity Distribution" description="By count" isLoading={isLoading} isEmpty={!data?.length}>
 *     <ResponsiveContainer>...</ResponsiveContainer>
 *   </ChartContainer>
 */

// Recharts tooltip style — shared across all charts (matches the dark card chrome)
export const TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '0.5rem',
  color: '#f3f4f6',
  fontSize: '12px',
  padding: '8px 12px',
} as const;

export interface ChartContainerProps {
  title: string;
  description?: string;
  /** Right-aligned actions (e.g. a legend toggle or filter button) */
  action?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Height of the chart area in pixels (default 280) */
  height?: number;
  children: ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  description,
  action,
  isLoading,
  isEmpty,
  error,
  onRetry,
  height = 280,
  children,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div style={{ height }} className="relative">
        {isLoading ? (
          <Skeleton className="absolute inset-0" />
        ) : error ? (
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="Failed to load chart"
            description={error}
            action={onRetry ? <button onClick={onRetry} className="text-primary-600 text-sm font-medium hover:text-primary-700">Try again</button> : undefined}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="No data to display"
            description="Once data is available, the chart will appear here."
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
