import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, getPaginationRowModel, getFacetedRowModel,
  type ColumnDef, type SortingState, type RowSelectionState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, AlertTriangle, Inbox, Archive, CheckCircle2, Trash2, X,
} from 'lucide-react';
import { useIncidents, useBulkResolve, useBulkDelete } from '../hooks/useIncidents';
import type { Incident } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cn } from '../lib/cn';
import { downloadIncidentPdf } from '../hooks/useIncidents';

const SEVERITY_BADGE: Record<string, { variant: 'neutral' | 'warning' | 'danger'; label: string }> = {
  NONE: { variant: 'neutral', label: 'None' },
  MINOR: { variant: 'warning', label: 'Minor' },
  MODERATE: { variant: 'warning', label: 'Moderate' },
  SEVERE: { variant: 'danger', label: 'Severe' },
};

const STATUS_BADGE: Record<string, { variant: 'danger' | 'success' | 'neutral' | 'primary'; label: string }> = {
  ACTIVE: { variant: 'danger', label: 'Active' },
  RESOLVED: { variant: 'success', label: 'Resolved' },
  FALSE_ALARM: { variant: 'neutral', label: 'False alarm' },
  ARCHIVED: { variant: 'neutral', label: 'Archived' },
};

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Use server-side pagination — only fetch the current page's data from API.
  // The TanStack Table here is for client-side sort/filter of the current page.
  const { data, isLoading, isError, error, refetch, isFetching } = useIncidents({
    page,
    limit: pageSize,
    severity: severity || undefined,
    status: status || undefined,
    search: search || undefined,
  });

  const bulkResolveMut = useBulkResolve();
  const bulkDeleteMut = useBulkDelete();

  // ─── Build TanStack Table from server-fetched data ───────────────────────
  const columns = useMemo<ColumnDef<Incident>[]>(() => [
    {
      id: 'select',
      size: 36,
      header: ({ table }) => (
        <IndeterminateCheckbox
          aria-label="Select all on page"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <IndeterminateCheckbox
          aria-label={`Select incident ${row.original.id.slice(0, 8)}`}
          checked={row.getIsSelected()}
          indeterminate={false}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const s = SEVERITY_BADGE[row.original.severity] || SEVERITY_BADGE.NONE;
        return <Badge variant={s.variant} size="sm">{s.label}</Badge>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = STATUS_BADGE[row.original.status] || STATUS_BADGE.ACTIVE;
        return <Badge variant={s.variant} size="sm" dot>{s.label}</Badge>;
      },
    },
    {
      accessorKey: 'occurredAt',
      header: ({ column }) => (
        <button
          onClick={column.getToggleSortingHandler()}
          className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
        >
          Date <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {new Date(row.original.occurredAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {row.original.user?.fullName || 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {row.original.user?.email || ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
          {row.original.address || 'No address'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/incidents/${row.original.id}`)}>
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Download PDF"
            onClick={() => downloadIncidentPdf(row.original.id)}
            className="h-8 w-8 p-0"
          >
            <Archive size={14} />
          </Button>
        </div>
      ),
    },
  ], [navigate]);

  const table = useReactTable({
    data: data?.data || [],
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    // Disable TanStack's pagination — we do server-side pagination.
    // TanStack handles sort + selection of the current page only.
    manualPagination: true,
    pageCount: -1,
  });

  // ─── Selection summary ─────────────────────────────────────────────────────
  const selectedIds = Object.keys(rowSelection);
  const selectedCount = selectedIds.length;

  const handleBulkResolve = () => {
    bulkResolveMut.mutate(selectedIds, {
      onSettled: () => {
        setRowSelection({});
      },
    });
  };

  const handleBulkDeleteConfirm = () => {
    bulkDeleteMut.mutate(selectedIds, {
      onSettled: () => {
        setConfirmBulkDelete(false);
        setRowSelection({});
      },
    });
  };

  // ─── Filter controls ──────────────────────────────────────────────────────
  const filterControls = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[240px] flex-1">
        <Input
          id="search"
          label="Search"
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Description, address, user name, email..."
          leftIcon={<Search size={14} />}
        />
      </div>
      <div className="w-44">
        <Select
          id="severity"
          label="Severity"
          placeholder="All severities"
          value={severity}
          onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          options={[
            { label: 'All severities', value: '' },
            { label: 'None', value: 'NONE' },
            { label: 'Minor', value: 'MINOR' },
            { label: 'Moderate', value: 'MODERATE' },
            { label: 'Severe', value: 'SEVERE' },
          ]}
        />
      </div>
      <div className="w-44">
        <Select
          id="status"
          label="Status"
          placeholder="All statuses"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[
            { label: 'All statuses', value: '' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Resolved', value: 'RESOLVED' },
            { label: 'False alarm', value: 'FALSE_ALARM' },
            { label: 'Archived', value: 'ARCHIVED' },
          ]}
        />
      </div>
      {(search || severity || status) && (
        <Button
          variant="ghost"
          size="md"
          onClick={() => { setSearch(''); setSeverity(''); setStatus(''); setPage(1); }}
          leftIcon={<X size={14} />}
        >
          Reset
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incidents</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data?.meta?.total ?? '—'} incidents in system. {isFetching && !isLoading ? 'Syncing…' : ''}
          </p>
        </div>
      </div>

      {filterControls}

      {/* ─── Bulk action bar ───────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 dark:border-primary-800 dark:bg-primary-900/20">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={handleBulkResolve}
              loading={bulkResolveMut.isPending}
              leftIcon={<CheckCircle2 size={14} />}
            >
              Bulk resolve
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmBulkDelete(true)}
              leftIcon={<Trash2 size={14} />}
            >
              Bulk archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
              aria-label="Clear selection"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Table ────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load incidents"
            description={error ? String(error) : undefined}
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={<Inbox size={40} />}
            title="No incidents found"
            description="Try adjusting your filters or check back later."
            action={
              (search || severity || status) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setSearch(''); setSeverity(''); setStatus(''); setPage(1); }}
                >
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 font-semibold"
                        style={header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/incidents/${row.original.id}`)}
                    className={cn(
                      'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      row.getIsSelected() && 'bg-primary-50/50 dark:bg-primary-900/10',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        onClick={(e) => {
                          // Prevent row navigation when clicking a checkbox or action button
                          if ((e.target as HTMLElement).closest('input, button')) return;
                        }}
                        className="px-4 py-3"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Pagination ────────────────────────────────────────────────────── */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); setRowSelection({}); }}
              options={[
                { label: '10', value: '10' },
                { label: '15', value: '15' },
                { label: '25', value: '25' },
                { label: '50', value: '50' },
              ]}
              className="w-20"
              aria-label="Rows per page"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page">
              <ChevronsLeft size={14} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page">
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2 text-sm text-gray-500 dark:text-gray-400">
              Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{' '}
              <span className="font-medium text-gray-900 dark:text-white">{data.meta.totalPages}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(data.meta.totalPages, page + 1))} disabled={page >= data.meta.totalPages} aria-label="Next page">
              <ChevronRight size={14} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(data.meta.totalPages)} disabled={page >= data.meta.totalPages} aria-label="Last page">
              <ChevronsRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Bulk delete confirmation ─────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDeleteConfirm}
        loading={bulkDeleteMut.isPending}
        title={`Archive ${selectedCount} incident${selectedCount === 1 ? '' : 's'}?`}
        description="This will soft-delete the selected incidents (isDeleted=true + status=ARCHIVED). They can be restored later from the detail page."
        confirmLabel="Yes, archive"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// Suppress unused-import warning
void AlertTriangle;

// ─── Indeterminate checkbox helper ────────────────────────────────────────────
//
// React doesn't accept `indeterminate` as a prop on <input type="checkbox">.
// We need to set it via a ref callback. This wrapper makes the API match
// what TanStack Table expects.
//
interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: (e: any) => void;
  'aria-label': string;
}

function IndeterminateCheckbox({ checked, indeterminate, onChange, ...rest }: IndeterminateCheckboxProps) {
  const ref = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = indeterminate;
  };
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      {...rest}
    />
  );
}
