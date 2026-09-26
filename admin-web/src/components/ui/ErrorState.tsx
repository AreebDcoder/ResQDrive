import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

/**
 * ErrorState — friendly error placeholder with retry.
 *
 * Usage:
 *   <ErrorState
 *     title="Failed to load incidents"
 *     description="The server is unreachable. Please check your connection."
 *     onRetry={() => refetch()}
 *   />
 *
 * Always use this instead of plain red text.
 */

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Retry button label (default "Try again") */
  retryLabel?: string;
  onRetry?: () => void;
  /** Custom icon (defaults to AlertCircle) */
  icon?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  retryLabel = 'Try again',
  onRetry,
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      <div className="mb-3 text-danger-500" aria-hidden>
        {icon || <AlertCircle size={40} />}
      </div>
      <p className="text-base font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw size={14} />}
          className="mt-4"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
