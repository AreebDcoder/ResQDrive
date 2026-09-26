import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Button — accessible, theme-aware button primitive.
 *
 * Variants:
 *   primary   — solid, brand color (default)
 *   secondary — outline / ghost surface
 *   success   — emerald (approve actions)
 *   warning   — amber (caution actions)
 *   danger    — rose (destructive actions)
 *   ghost     — transparent (icon buttons)
 *
 * Sizes: sm / md / lg / icon
 *
 * Features:
 *   - loading state (auto-disables + shows spinner)
 *   - leftIcon / rightIcon slots
 *   - full width option
 *   - focus-visible ring (WCAG 2.4.7)
 *   - aria-label support for icon-only buttons
 *   - prefers-reduced-motion respected (no transform on active)
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
  secondary:
    'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
  success:
    'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-sm',
  warning:
    'bg-warning-600 text-white hover:bg-warning-700 active:bg-warning-800 shadow-sm',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-sm',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-10 w-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          // base
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          // focus ring (WCAG 2.4.7)
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
          // disabled
          'disabled:pointer-events-none disabled:opacity-50',
          // motion preference
          'motion-safe:active:scale-[0.98]',
          VARIANTS[variant],
          SIZES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" aria-hidden />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
