import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — Tailwind-aware className combiner.
 *
 * Usage:
 *   cn('px-4 py-2', condition && 'bg-red-500', isLarge ? 'text-lg' : 'text-sm')
 *
 * - clsx handles conditional + object + array syntax
 * - tailwind-merge dedupes conflicting Tailwind classes (later wins)
 *
 * Always use `cn()` instead of string concatenation in component className props.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
