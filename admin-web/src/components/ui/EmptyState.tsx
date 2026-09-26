import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * EmptyState — friendly empty-data placeholder.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Inbox size={48} />}
 *     title="No incidents found"
 *     description="Adjust your filters or check back later."
 *     action={<Button onClick={resetFilters}>Reset filters</Button>}
 *   />
 *
 * Always use this instead of plain "No data" text.
 */

export interface EmptyStateProps {
  /** Lucide icon (e.g. <Inbox />). Recommended size: 40-56 */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Call-to-action button(s) */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 text-gray-300 dark:text-gray-700" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
