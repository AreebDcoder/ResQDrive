import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Select — accessible dropdown select with label + hint + error.
 *
 * Wraps the native <select> for accessibility + mobile friendliness.
 * For rich dropdowns with search, use a combobox (not yet implemented).
 */

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, hint, error, options, placeholder, required, className, ...props }, ref) => {
    const generatedId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
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

        <div className="relative">
          <select
            ref={ref}
            id={generatedId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            required={required}
            className={cn(
              'h-10 w-full appearance-none rounded-lg border bg-white px-3 pr-9 text-sm text-gray-900',
              'border-gray-300 transition-colors',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              'dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700 dark:disabled:bg-gray-900',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
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

Select.displayName = 'Select';
