import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Spinner — standalone loading indicator.
 *
 * Usage:
 *   <Spinner size={20} className="text-primary-500" />
 *   <Spinner />  // default size 16
 *
 * For inline buttons use Button's `loading` prop instead.
 */

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 16, className, label = 'Loading' }: SpinnerProps) {
  return (
    <span className="inline-flex items-center" role="status" aria-live="polite">
      <Loader2 size={size} className={cn('animate-spin text-current', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
