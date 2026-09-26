import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/**
 * Badge — small status indicator.
 *
 * Variants map to semantic colors.
 *
 * Usage:
 *   <Badge variant="success">RESOLVED</Badge>
 *   <Badge variant="danger" size="sm">SEVERE</Badge>
 */

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Render as a dot + label (for live status) */
  dot?: boolean;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  success: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300',
  danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300',
  info: 'bg-info-100 text-info-700 dark:bg-info-900/40 dark:text-info-300',
  neutral: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  neutral: 'bg-gray-400',
};

export function Badge({ className, variant = 'default', size = 'md', dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[variant])} aria-hidden />}
      {children}
    </span>
  );
}
