import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Switch — accessible toggle (on/off).
 *
 * Usage:
 *   <Switch
 *     checked={enabled}
 *     onChange={setEnabled}
 *     label="Auto-refresh"
 *   />
 *
 * Features:
 *   - role="switch" (proper ARIA semantics)
 *   - aria-checked updates automatically
 *   - keyboard support (Space + Enter to toggle)
 *   - focus-visible ring
 *   - size variants
 */

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = {
  sm: { track: 'h-4 w-7', thumb: 'h-3 w-3', translate: 'translate-x-3' },
  md: { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4' },
};

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: SwitchProps) {
  const sz = SIZES[size];
  const switchId = label ? `switch-${typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : Math.random().toString(36).slice(2)}` : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? switchId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
          'disabled:cursor-not-allowed disabled:opacity-50',
          sz.track,
          checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700',
        )}
      >
        <span
          className={cn(
            'inline-block transform rounded-full bg-white shadow-sm transition-transform',
            sz.thumb,
            checked ? sz.translate : 'translate-x-0.5',
          )}
        />
      </button>
      {label && (
        <div className="flex-1">
          <label htmlFor={switchId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}
