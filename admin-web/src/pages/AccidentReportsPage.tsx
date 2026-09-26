import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, Trash2, X, Car, Phone, MapPin, FileText,
} from 'lucide-react';
import { useAccidentReports, useDeleteAccidentReport } from '../hooks/useAccidentReports';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type ReportWithUser = {
  id: string;
  userId: string;
  vehicleId?: string | null;
  incidentId?: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  latitude?: number | null;
  longitude?: number | null;
  detectedRegion?: string | null;
  calledServiceName?: string | null;
  calledAt?: string | null;
  autoDialed: boolean;
  damagePhotoUrls?: any;
  pdfUrl?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; phoneNumber: string };
  vehicle?: { id: string; make: string; model: string; year: number; licensePlate: string } | null;
};

const SEVERITY_BADGE: Record<string, { variant: 'warning' | 'danger' | 'neutral'; label: string }> = {
  minor: { variant: 'warning', label: 'Minor' },
  moderate: { variant: 'warning', label: 'Moderate' },
  severe: { variant: 'danger', label: 'Severe' },
};

export default function AccidentReportsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [autoDialed, setAutoDialed] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useAccidentReports({
    page,
    limit: pageSize,
    search: search || undefined,
    severity: severity || undefined,
    autoDialed: autoDialed === '' ? undefined : autoDialed === 'true',
  });

  const deleteMut = useDeleteAccidentReport();

  const columns = useMemo<ColumnDef<ReportWithUser>[]>(() => [
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const s = SEVERITY_BADGE[row.original.severity] || SEVERITY_BADGE.minor;
        return <Badge variant={s.variant} size="sm">{s.label}</Badge>;
      },
    },
    {
      id: 'owner',
      header: 'Reporter',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/users/${row.original.userId}`)} className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
          {row.original.user?.fullName || 'Unknown'}
        </button>
      ),
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      cell: ({ row }) =>
        row.original.vehicle ? (
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {row.original.vehicle.make} {row.original.vehicle.model} ({row.original.vehicle.year})
          </span>
        ) : <span className="text-xs text-gray-400">—</span>,
    },
    {
      accessorKey: 'detectedRegion',
      header: 'Region',
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-300">{row.original.detectedRegion || '—'}</span>,
    },
    {
      accessorKey: 'calledServiceName',
      header: 'Called service',
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-300">{row.original.calledServiceName || '—'}</span>,
    },
    {
      accessorKey: 'autoDialed',
      header: 'Auto-dial',
      cell: ({ row }) => <Badge variant={row.original.autoDialed ? 'info' : 'neutral'} size="sm" dot>{row.original.autoDialed ? 'Auto' : 'Manual'}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">Reported <ArrowUpDown size={12} /></button>
      ),
      cell: ({ row }) => <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(row.original.createdAt).toLocaleString()}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.pdfUrl && (
            <Button size="sm" variant="ghost" aria-label="View PDF" onClick={() => { if (row.original.pdfUrl) window.open(row.original.pdfUrl, '_blank'); }} className="h-8 w-8 p-0">
              <FileText size={14} />
            </Button>
          )}
          {row.original.incidentId && (
            <Button size="sm" variant="ghost" aria-label="View incident" onClick={() => navigate(`/incidents/${row.original.incidentId}`)} className="h-8 w-8 p-0">
              <FileText size={14} />
            </Button>
          )}
          <Button size="sm" variant="ghost" aria-label="Delete report" onClick={() => setConfirmDelete(row.original.id)} className="h-8 w-8 p-0 text-danger-500 hover:text-danger-600">
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], [navigate]);

  const table = useReactTable({
    data: data?.data || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: -1,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accident reports</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.meta?.total ?? '—'} reports generated by the SOS flow (post-incident auto-dial + manual log). {isFetching && !isLoading ? 'Syncing…' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Region, called service, reporter name/email/phone..." leftIcon={<Search size={14} />} />
        </div>
        <div className="w-44">
          <Select id="severity" label="Severity" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} options={[
            { label: 'All severities', value: '' },
            { label: 'Minor', value: 'minor' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Severe', value: 'severe' },
          ]} />
        </div>
        <div className="w-44">
          <Select id="autoDialed" label="Auto-dial" value={autoDialed} onChange={(e) => { setAutoDialed(e.target.value); setPage(1); }} options={[
            { label: 'All reports', value: '' },
            { label: 'Auto-dialed', value: 'true' },
            { label: 'Manually dialed', value: 'false' },
          ]} />
        </div>
        {(search || severity || autoDialed) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setSeverity(''); setAutoDialed(''); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <ErrorState title="Failed to load accident reports" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={<Inbox size={40} />} title="No reports found" description="Try adjusting your filters." action={(search || severity || autoDialed) ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setSeverity(''); setAutoDialed(''); setPage(1); }}>Reset filters</Button> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => <th key={header.id} className="px-4 py-3 font-semibold">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
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
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} options={[{ label: '10', value: '10' }, { label: '15', value: '15' }, { label: '25', value: '25' }, { label: '50', value: '50' }]} className="w-20" aria-label="Rows per page" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page"><ChevronsLeft size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={14} /></Button>
            <span className="px-2 text-sm text-gray-500 dark:text-gray-400">Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of <span className="font-medium text-gray-900 dark:text-white">{data.meta.totalPages}</span></span>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(data.meta.totalPages, page + 1))} disabled={page >= data.meta.totalPages} aria-label="Next page"><ChevronRight size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(data.meta.totalPages)} disabled={page >= data.meta.totalPages} aria-label="Last page"><ChevronsRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteMut.mutate(confirmDelete, { onSettled: () => setConfirmDelete(null) }); }}
        loading={deleteMut.isPending}
        title="Delete this accident report?"
        description="This permanently removes the report record. The underlying incident (if linked via incidentId) is NOT deleted — only this report entry is removed."
        confirmLabel="Yes, delete"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// Suppress unused-import warnings
void Car; void Phone; void MapPin;
