import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Input — accessible text input with optional label + hint + error.
 *
 * - label is associated via htmlFor + matching id
 * - error text uses aria-invalid + aria-describedby
 * - hint text uses aria-describedby
 * - required asterisk rendered automatically
 */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  /** Renders a left-affixed icon (lucide) */
  leftIcon?: ReactNode;
  /** Renders a right-affixed icon/button (e.g. password show toggle) */
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, hint, error, leftIcon, rightSlot, required, className, ...props }, ref) => {
    const generatedId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hintId = hint ? `${generatedId}-hint` : undefined;
    const errorId = error ? `${generatedId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={generatedId}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="ml-0.5 text-danger-500" aria-hidden>*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="pointer-events-none absolute left-3 text-gray-400 dark:text-gray-500"
              aria-hidden
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={generatedId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            required={required}
            className={cn(
              'h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400',
              'border-gray-300 transition-colors',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              'dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:border-gray-700 dark:disabled:bg-gray-900',
              leftIcon && 'pl-10',
              rightSlot && 'pr-10',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30',
              className,
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-2 flex items-center">{rightSlot}</span>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-danger-600 dark:text-danger-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
