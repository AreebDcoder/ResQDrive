import { useMemo, useState, Fragment } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, X, Download, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useRepairReports, downloadRepairReportPdf } from '../hooks/useTelemetry';
import { ChartContainer } from '../components/charts/ChartContainer';
import { DonutChart } from '../components/charts/DonutChart';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from 'sonner';
import api from '../api';
import { useQueryClient } from '@tanstack/react-query';

type RepairReport = {
  id: string;
  userId: string;
  vehicleId?: string | null;
  incidentId?: string | null;
  totalMinCostPkr: number;
  totalMaxCostPkr: number;
  lineItems: any;
  pdfUrl?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
  vehicle?: { id: string; make: string; model: string; year: number; licensePlate: string } | null;
  damageAssessment?: { incidentId: string; predictedDamageType: string; derivedSeverity: string; confidenceScore: number; photoUrl: string } | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#fbbf24',
  moderate: '#fb923c',
  severe: '#ef4444',
};

const parseLineItems = (lineItems: any) => {
  if (!lineItems) return [];
  try {
    const items = typeof lineItems === 'string' ? JSON.parse(lineItems) : lineItems;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

export default function RepairCostReportsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [damageType, setDamageType] = useState('');
  const [severity, setSeverity] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useRepairReports({
    page,
    limit: pageSize,
    search: search || undefined,
    damageType: damageType || undefined,
    severity: severity || undefined,
  });

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/repair-cost/report/${confirmDelete}`);
      qc.invalidateQueries({ queryKey: ['repair-reports'] });
      toast.success('Repair report deleted.');
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete report.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = useMemo<ColumnDef<RepairReport>[]>(() => [
    {
      id: 'expand',
      header: '',
      size: 36,
      cell: ({ row }) => {
        const items = parseLineItems(row.original.lineItems);
        if (items.length === 0) return null;
        return (
          <button
            onClick={() => toggleRow(row.original.id)}
            aria-label={expandedRows.has(row.original.id) ? 'Collapse' : 'Expand line items'}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            {expandedRows.has(row.original.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        );
      },
      enableSorting: false,
    },
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{row.original.user?.fullName || 'Unknown'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.user?.email || ''}</p>
        </div>
      ),
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      cell: ({ row }) => row.original.vehicle ? (
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {row.original.vehicle.make} {row.original.vehicle.model} ({row.original.vehicle.year})
        </span>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
    {
      id: 'damageType',
      header: 'Damage type',
      cell: ({ row }) => row.original.damageAssessment ? (
        <Badge variant="neutral" size="sm">{row.original.damageAssessment.predictedDamageType}</Badge>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
    {
      id: 'severity',
      header: 'Severity',
      cell: ({ row }) => row.original.damageAssessment ? (
        <Badge
          variant={row.original.damageAssessment.derivedSeverity === 'severe' ? 'danger' : row.original.damageAssessment.derivedSeverity === 'moderate' ? 'warning' : 'neutral'}
          size="sm"
        >
          {row.original.damageAssessment.derivedSeverity}
        </Badge>
      ) : <span className="text-xs text-gray-400">—</span>,
    },
    {
      accessorKey: 'totalMinCostPkr',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          Min cost <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => <span className="text-sm font-semibold text-success-600 dark:text-success-400">Rs. {row.original.totalMinCostPkr?.toLocaleString()}</span>,
    },
    {
      accessorKey: 'totalMaxCostPkr',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          Max cost <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => <span className="text-sm font-semibold text-success-600 dark:text-success-400">Rs. {row.original.totalMaxCostPkr?.toLocaleString()}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          Created <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(row.original.createdAt).toLocaleString()}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" aria-label="Download PDF" onClick={() => toast.promise(downloadRepairReportPdf(row.original.id), { loading: 'Generating PDF…', success: 'PDF downloaded.', error: 'PDF download failed.' })} className="h-8 w-8 p-0">
            <Download size={14} />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Delete report" onClick={() => setConfirmDelete(row.original.id)} className="h-8 w-8 p-0 text-danger-500 hover:text-danger-600">
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], [expandedRows]);

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

  // Gemini vs fallback ratio donut (current page)
  const sourceDonut = useMemo(() => {
    let gemini = 0, fallback = 0;
    (data?.data || []).forEach((r: any) => {
      const items = parseLineItems(r.lineItems);
      items.forEach((item: any) => {
        if (item.partsSource === 'gemini_ai') gemini++;
        else if (item.partsSource === 'fallback_default') fallback++;
      });
    });
    return [
      { name: 'Gemini AI', value: gemini, color: '#6366f1' },
      { name: 'Fallback default', value: fallback, color: '#9ca3af' },
    ];
  }, [data]);

  // Aggregate totals for current page
  const aggregate = useMemo(() => {
    const reports = data?.data || [];
    const totalMin = reports.reduce((sum, r) => sum + (r.totalMinCostPkr || 0), 0);
    const totalMax = reports.reduce((sum, r) => sum + (r.totalMaxCostPkr || 0), 0);
    const avgMin = reports.length ? Math.round(totalMin / reports.length) : 0;
    const avgMax = reports.length ? Math.round(totalMax / reports.length) : 0;
    return { totalMin, totalMax, avgMin, avgMax, count: reports.length };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repair cost reports</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.total ?? '—'} reports. {isFetching && !isLoading ? 'Syncing…' : ''}
        </p>
      </div>

      {/* Aggregate summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Reports on page</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{aggregate.count}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total min cost</p>
          <p className="mt-1 text-2xl font-bold text-success-600 dark:text-success-400">Rs. {aggregate.totalMin.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total max cost</p>
          <p className="mt-1 text-2xl font-bold text-success-600 dark:text-success-400">Rs. {aggregate.totalMax.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Avg cost range</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Rs. {aggregate.avgMin.toLocaleString()} – {aggregate.avgMax.toLocaleString()}</p>
        </div>
      </div>

      {/* Gemini-vs-fallback donut chart */}
      <ChartContainer title="Parts source (current page)" description="Gemini AI vs fallback default pricing" isLoading={isLoading} isEmpty={sourceDonut.every((d) => d.value === 0)} height={240}>
        <DonutChart data={sourceDonut} />
      </ChartContainer>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="User name, vehicle make/model/plate..." leftIcon={<Search size={14} />} />
        </div>
        <div className="w-44">
          <Select id="damage-type" label="Damage type" value={damageType} onChange={(e) => { setDamageType(e.target.value); setPage(1); }} options={[
            { label: 'All types', value: '' },
            { label: 'scratch', value: 'scratch' },
            { label: 'dent', value: 'dent' },
            { label: 'lamp_broken', value: 'lamp_broken' },
            { label: 'tire_flat', value: 'tire_flat' },
            { label: 'crack', value: 'crack' },
            { label: 'glass_shatter', value: 'glass_shatter' },
          ]} />
        </div>
        <div className="w-40">
          <Select id="severity" label="Severity" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} options={[
            { label: 'All severities', value: '' },
            { label: 'minor', value: 'minor' },
            { label: 'moderate', value: 'moderate' },
            { label: 'severe', value: 'severe' },
          ]} />
        </div>
        {(search || damageType || severity) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setDamageType(''); setSeverity(''); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <ErrorState title="Failed to load repair reports" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={<Inbox size={40} />} title="No repair reports" description="No repair cost reports match your filters." action={(search || damageType || severity) ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setDamageType(''); setSeverity(''); setPage(1); }}>Reset filters</Button> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => <th key={header.id} className="px-4 py-3 font-semibold" style={header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {table.getRowModel().rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                    </tr>
                    {expandedRows.has(row.original.id) && (
                      <tr key={`${row.id}-detail`} className="bg-gray-50/50 dark:bg-gray-800/20">
                        <td colSpan={columns.length} className="px-4 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Line items</p>
                          <div className="space-y-1">
                            {parseLineItems(row.original.lineItems).map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-900">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white">{item.part || item.partTag}</p>
                                  <p className="text-gray-500 dark:text-gray-400">
                                    {item.damageType} • {item.action} • {item.partsSource === 'gemini_ai' ? 'Gemini AI' : 'Fallback'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-success-600 dark:text-success-400">Rs. {(item.lineTotal?.min || item.cost || 0).toLocaleString()} – {(item.lineTotal?.max || item.cost || 0).toLocaleString()}</p>
                                  <p className="text-gray-400">Labor: Rs. {item.laborCost?.min || 0}–{item.laborCost?.max || 0}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} options={[{ label: '10', value: '10' }, { label: '15', value: '15' }, { label: '25', value: '25' }, { label: '50', value: '50' }]} className="w-20" aria-label="Rows per page" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page"><ChevronsLeft size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={14} /></Button>
            <span className="px-2 text-sm text-gray-500 dark:text-gray-400">Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of <span className="font-medium text-gray-900 dark:text-white">{Math.ceil(data.total / pageSize)}</span></span>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(Math.ceil(data.total / pageSize), page + 1))} disabled={page >= Math.ceil(data.total / pageSize)} aria-label="Next page"><ChevronRight size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.ceil(data.total / pageSize))} disabled={page >= Math.ceil(data.total / pageSize)} aria-label="Last page"><ChevronsRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this repair report?"
        description="This permanently removes the report record. The linked incident (if any) is NOT deleted — only this report entry."
        confirmLabel="Yes, delete"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}
