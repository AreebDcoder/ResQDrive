import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, type RowSelectionState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Car, Inbox, Star, X,
} from 'lucide-react';
import { useVehicles, useSetPrimaryVehicle, useDeleteVehicle } from '../hooks/useVehicles';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cn } from '../lib/cn';

type VehicleWithUser = {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  licensePlate: string;
  isPrimary: boolean;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; phoneNumber: string };
  insurance?: { providerName?: string | null; policyNumber?: string | null } | null;
};

export default function VehiclesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [isPrimaryFilter, setIsPrimaryFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useVehicles({
    page,
    limit: pageSize,
    search: search || undefined,
    isPrimary: isPrimaryFilter === '' ? undefined : isPrimaryFilter === 'true',
  });

  const setPrimaryMut = useSetPrimaryVehicle();
  const deleteMut = useDeleteVehicle();

  const columns = useMemo<ColumnDef<VehicleWithUser>[]>(() => [
    {
      accessorKey: 'make',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          Vehicle <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/vehicles/${row.original.id}`)}
          className="flex items-center gap-2 hover:text-primary-700 dark:hover:text-primary-300"
        >
          <Car size={16} className="text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            {row.original.make} {row.original.model}
          </span>
        </button>
      ),
    },
    {
      accessorKey: 'year',
      header: 'Year',
      cell: ({ row }) => <span className="text-sm text-gray-600 dark:text-gray-300">{row.original.year}</span>,
    },
    {
      accessorKey: 'color',
      header: 'Color',
      cell: ({ row }) => <span className="text-sm text-gray-600 dark:text-gray-300">{row.original.color || '—'}</span>,
    },
    {
      accessorKey: 'licensePlate',
      header: 'Plate',
      cell: ({ row }) => <Badge variant="neutral" size="sm">{row.original.licensePlate}</Badge>,
    },
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{row.original.user?.fullName || 'Unknown'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.user?.email || ''}</p>
        </div>
      ),
    },
    {
      accessorKey: 'isPrimary',
      header: 'Primary',
      cell: ({ row }) =>
        row.original.isPrimary ? (
          <Badge variant="success" size="sm" dot><Star size={10} className="inline" /></Badge>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      id: 'insurance',
      header: 'Insurance',
      cell: ({ row }) =>
        row.original.insurance ? (
          <span className="text-xs text-gray-600 dark:text-gray-300">{row.original.insurance.providerName || 'On file'}</span>
        ) : (
          <Badge variant="neutral" size="sm">None</Badge>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/vehicles/${row.original.id}`)}>View</Button>
          {!row.original.isPrimary && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Set as primary"
              onClick={() => setPrimaryMut.mutate(row.original.id)}
              className="h-8 w-8 p-0"
            >
              <Star size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ], [navigate, setPrimaryMut]);

  const table = useReactTable({
    data: data?.data || [],
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: -1,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicles</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.meta?.total ?? '—'} vehicles in system. {isFetching && !isLoading ? 'Syncing…' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            id="search"
            label="Search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Make, model, plate, owner name, owner email..."
            leftIcon={<Search size={14} />}
          />
        </div>
        <div className="w-44">
          <Select
            id="primary-filter"
            label="Primary status"
            value={isPrimaryFilter}
            onChange={(e) => { setIsPrimaryFilter(e.target.value); setPage(1); }}
            options={[
              { label: 'All vehicles', value: '' },
              { label: 'Primary only', value: 'true' },
              { label: 'Non-primary only', value: 'false' },
            ]}
          />
        </div>
        {(search || isPrimaryFilter) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setIsPrimaryFilter(''); setPage(1); }} leftIcon={<X size={14} />}>
            Reset
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : isError ? (
          <ErrorState title="Failed to load vehicles" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={<Inbox size={40} />}
            title="No vehicles found"
            description="Try adjusting your filters."
            action={(search || isPrimaryFilter) ? (
              <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setIsPrimaryFilter(''); setPage(1); }}>Reset filters</Button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-semibold">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              options={[{ label: '10', value: '10' }, { label: '15', value: '15' }, { label: '25', value: '25' }, { label: '50', value: '50' }]}
              className="w-20"
              aria-label="Rows per page"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page"><ChevronsLeft size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={14} /></Button>
            <span className="px-2 text-sm text-gray-500 dark:text-gray-400">
              Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{' '}
              <span className="font-medium text-gray-900 dark:text-white">{data.meta.totalPages}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(data.meta.totalPages, page + 1))} disabled={page >= data.meta.totalPages} aria-label="Next page"><ChevronRight size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(data.meta.totalPages)} disabled={page >= data.meta.totalPages} aria-label="Last page"><ChevronsRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Delete confirm (unused for now — kept for future bulk delete) */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteMut.mutate(confirmDelete, { onSettled: () => setConfirmDelete(null) });
        }}
        loading={deleteMut.isPending}
        title="Delete this vehicle?"
        description="This permanently removes the vehicle record and its insurance record (cascade delete). Linked damage assessments, repair cost reports, and accident reports are preserved (their vehicleId becomes null via SetNull)."
        confirmLabel="Yes, delete"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// Suppress unused-import warning
void cn;
