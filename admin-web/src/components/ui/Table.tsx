import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/**
 * Table — accessible, responsive table primitive.
 *
 * Wrap in a Table.Shell for horizontal scroll on small screens:
 *   <Table.Shell>
 *     <Table>
 *       <Table.Head>
 *         <Table.Row>
 *           <Table.Th>Severity</Table.Th>
 *         </Table.Row>
 *       </Table.Head>
 *       <Table.Body>
 *         <Table.Row>
 *           <Table.Td>SEVERE</Table.Td>
 *         </Table.Row>
 *       </Table.Body>
 *     </Table>
 *   </Table.Shell>
 *
 * Features:
 *   - sticky header
 *   - row hover state
 *   - click handler on Row (with proper role + keyboard handler)
 *   - responsive horizontal scroll via Shell wrapper
 */

export function TableShell({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('w-full border-collapse text-left text-sm', className)}
      {...props}
    >
      {children}
    </table>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y divide-gray-100 dark:divide-gray-800', className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  onClick,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { onClick?: (e: React.MouseEvent<HTMLTableRowElement>) => void }) {
  const clickable = Boolean(onClick);
  return (
    <tr
      onClick={onClick}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e as any);
              }
            }
          : undefined
      }
      className={cn(
        'transition-colors',
        clickable && 'cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-gray-800/50',
        !clickable && 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-4 py-3 font-semibold', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-gray-700 dark:text-gray-300', className)} {...props} />;
}

// Attach helpers as static properties: `Table.Shell`, `Table.Head`, etc.
export const TablePrimitive = Object.assign(Table, {
  Shell: TableShell,
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  Th: TableHeaderCell,
  Td: TableCell,
});
