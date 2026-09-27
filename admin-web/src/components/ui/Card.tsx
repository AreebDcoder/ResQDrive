import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Card — surface container primitive.
 *
 * Parts: Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter
 *
 * Usage:
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>Severity Distribution</CardTitle>
 *       <CardDescription>Total incidents by severity level</CardDescription>
 *     </CardHeader>
 *     <CardContent>...</CardContent>
 *   </Card>
 */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add a colored left border accent. Use semantic colors: primary/success/warning/danger/info */
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'none';
  /** Remove default padding (use for charts where the child controls its own padding) */
  flush?: boolean;
}

const ACCENTS: Record<NonNullable<CardProps['accent']>, string> = {
  primary: 'border-l-4 border-l-primary-500',
  success: 'border-l-4 border-l-success-500',
  warning: 'border-l-4 border-l-warning-500',
  danger: 'border-l-4 border-l-danger-500',
  info: 'border-l-4 border-l-info-500',
  none: '',
};

export function Card({ className, accent = 'none', flush = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white border-gray-200 shadow-sm',
        'dark:bg-gray-900 dark:border-gray-800',
        !flush && 'p-6',
        accent !== 'none' && ACCENTS[accent],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props} />;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)}>{children}</h2>;
}

export function CardDescription({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('mt-1 text-sm text-gray-500 dark:text-gray-400', className)}>{children}</p>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 flex items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-800', className)} {...props} />;
}
