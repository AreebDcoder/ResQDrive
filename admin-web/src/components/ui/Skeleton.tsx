import { cn } from '../../lib/cn';

/**
 * Skeleton — gray pulse placeholder matching the layout of upcoming content.
 *
 * Always use Skeletons (not plain "Loading..." text) to prevent layout shift.
 *
 * Presets:
 *   <Skeleton.Text className="h-4 w-32" />   → text line
 *   <Skeleton.Circle className="h-10 w-10" /> → avatar
 *   <Skeleton.Block className="h-64 w-full" /> → chart placeholder
 *
 * For full-page loading states, use the LayoutSkeleton pattern (see Batch 2+).
 */

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
        className,
      )}
    />
  );
}

// Helpers for common shapes
function Text({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-4', className)} />;
}

function Circle({ className }: SkeletonProps) {
  return <Skeleton className={cn('rounded-full', className)} />;
}

function Block({ className }: SkeletonProps) {
  return <Skeleton className={className} />;
}

// Attach helpers as static properties so callers can use `Skeleton.Text` etc.
// (TypeScript-safe via Object.assign with intersection type.)
export const SkeletonPrimitive = Object.assign(Skeleton, { Text, Circle, Block });
