import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';
import type { DateRange } from '../hooks/useDashboardData';

/**
 * DateRangePicker — preset-based date selector for the Dashboard.
 *
 * Presets:
 *   7d  — last 7 days
 *   30d — last 30 days (default)
 *   90d — last 90 days
 *   all — all-time (no dateFrom/dateTo sent)
 *
 * Custom range: hidden in Batch 3 for simplicity. Will be added in Batch 8
 * with a proper dual-calendar popover (react-day-picker or similar).
 *
 * Features:
 *   - Compact dropdown (no inline date inputs cluttering the toolbar)
 *   - Click-outside to close
 *   - ESC to close
 *   - aria-haspopup + aria-expanded
 *   - Active preset highlighted
 */

export type PresetKey = '7d' | '30d' | '90d' | 'all';

interface DateRangePickerProps {
  preset: PresetKey;
  onPresetChange: (preset: PresetKey) => void;
  className?: string;
}

export const PRESETS: { key: PresetKey; label: string; description: string }[] = [
  { key: '7d', label: 'Last 7 days', description: 'Past week' },
  { key: '30d', label: 'Last 30 days', description: 'Past month' },
  { key: '90d', label: 'Last 90 days', description: 'Past quarter' },
  { key: 'all', label: 'All time', description: 'No date filter' },
];

/** Convert a preset to a DateRange (or undefined for 'all') */
export function presetToRange(preset: PresetKey): DateRange | undefined {
  if (preset === 'all') return undefined;
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);
  dateFrom.setHours(0, 0, 0, 0);
  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}

export function DateRangePicker({ preset, onPresetChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      window.addEventListener('keydown', escHandler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  const activePreset = PRESETS.find((p) => p.key === preset);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <Calendar size={16} className="text-gray-400" aria-hidden />
        <span>{activePreset?.label || 'Select range'}</span>
        <ChevronDown size={14} className="text-gray-400" aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Date range presets"
          className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          {PRESETS.map((p) => (
            <button
              key={p.key}
              role="option"
              aria-selected={preset === p.key}
              onClick={() => {
                onPresetChange(p.key);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                preset === p.key
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
              )}
            >
              <div className="text-left">
                <div className="font-medium">{p.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{p.description}</div>
              </div>
              {preset === p.key && (
                <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
