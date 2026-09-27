import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/cn';

/**
 * Pagination — accessible page navigation.
 *
 * Usage:
 *   <Pagination
 *     page={page}
 *     totalPages={totalPages}
 *     total={total}
 *     pageSize={limit}
 *     onPageChange={setPage}
 *   />
 */

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
        Showing <span className="font-medium text-gray-700 dark:text-gray-200">{from}</span>
        {'–'}
        <span className="font-medium text-gray-700 dark:text-gray-200">{to}</span> of{' '}
        <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          leftIcon={<ChevronLeft size={14} />}
          aria-label="Previous page"
        >
          Prev
        </Button>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          Page <span className="font-medium text-gray-700 dark:text-gray-200">{page}</span> of{' '}
          <span className="font-medium text-gray-700 dark:text-gray-200">{totalPages}</span>
        </span>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          rightIcon={<ChevronRight size={14} />}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
