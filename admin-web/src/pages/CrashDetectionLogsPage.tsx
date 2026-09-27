import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, X, AudioLines,
} from 'lucide-react';
import { useCrashLogs } from '../hooks/useTelemetry';
import { ChartContainer } from '../components/charts/ChartContainer';
import { HistogramChart } from '../components/charts/HistogramChart';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

type CrashLog = {
  id: string;
  userId: string;
  windowTimestamp: string;
  topMatchedClass?: string | null;
  crashConfidence: number;
  thresholdUsed: number;
  flaggedAsCrash: boolean;
  combinedWithSensorSignal: boolean;
  triggeredByTransient: boolean;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
};

const CLASS_COLORS: Record<string, string> = {
  Crash: '#ef4444',
  Glass: '#f59e0b',
  Shatter: '#fb923c',
  Explosion: '#dc2626',
  Boom: '#ef4444',
  Skidding: '#0ea5e9',
  'Tire squeal': '#10b981',
  Vehicle: '#6366f1',
};

export default function CrashDetectionLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [className, setClassName] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading, isError, error, refetch, isFetching } = useCrashLogs({
    page,
    limit: pageSize,
    search: search || undefined,
    flaggedOnly: flaggedOnly || undefined,
    className: className || undefined,
    minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
  });

  const columns = useMemo<ColumnDef<CrashLog>[]>(() => [
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
      accessorKey: 'topMatchedClass',
      header: 'Top class',
      cell: ({ row }) => {
        const cls = row.original.topMatchedClass || 'N/A';
        const color = CLASS_COLORS[cls] || '#6b7280';
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            <span className="text-sm text-gray-700 dark:text-gray-200">{cls}</span>
          </span>
        );
      },
    },
    {
      accessorKey: 'crashConfidence',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          Confidence <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => {
        const pct = (row.original.crashConfidence * 100).toFixed(1);
        const color = row.original.crashConfidence >= 0.6 ? 'text-danger-600 dark:text-danger-400' : row.original.crashConfidence >= 0.3 ? 'text-warning-600 dark:text-warning-400' : 'text-gray-500';
        return <span className={`text-xs font-bold ${color}`}>{pct}%</span>;
      },
    },
    {
      accessorKey: 'flaggedAsCrash',
      header: 'Flagged',
      cell: ({ row }) => <Badge variant={row.original.flaggedAsCrash ? 'danger' : 'neutral'} size="sm" dot>{row.original.flaggedAsCrash ? 'YES' : 'NO'}</Badge>,
    },
    {
      accessorKey: 'combinedWithSensorSignal',
      header: 'Sensor fusion',
      cell: ({ row }) => <Badge variant={row.original.combinedWithSensorSignal ? 'success' : 'neutral'} size="sm">{row.original.combinedWithSensorSignal ? 'Fused' : 'Audio only'}</Badge>,
    },
    {
      accessorKey: 'triggeredByTransient',
      header: 'Trigger',
      cell: ({ row }) => <Badge variant="info" size="sm">{row.original.triggeredByTransient ? 'Transient' : 'Manual'}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          Timestamp <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(row.original.createdAt).toLocaleString()}</span>,
    },
  ], []);

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

  // Histogram data — bucket confidence values into 0-0.2, 0.2-0.4, ..., 0.8-1.0
  const histogramValues = useMemo(() => (data?.data || []).map((l: any) => l.crashConfidence), [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crash detection logs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.total ?? '—'} YAMNet audio detection events. {isFetching && !isLoading ? 'Syncing…' : ''}
        </p>
      </div>

      {/* Confidence histogram chart */}
      <ChartContainer title="Confidence distribution (current page)" description="Crash confidence values bucketed into 5 ranges" isLoading={isLoading} isEmpty={histogramValues.length === 0} height={240}>
        <HistogramChart data={histogramValues} buckets={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} valueLabel="Confidence" />
      </ChartContainer>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Class name, user name, user email..." leftIcon={<Search size={14} />} />
        </div>
        <div className="w-44">
          <Select id="class-name" label="Top class" value={className} onChange={(e) => { setClassName(e.target.value); setPage(1); }} options={[
            { label: 'All classes', value: '' },
            { label: 'Crash', value: 'Crash' },
            { label: 'Glass', value: 'Glass' },
            { label: 'Shatter', value: 'Shatter' },
            { label: 'Explosion', value: 'Explosion' },
            { label: 'Boom', value: 'Boom' },
            { label: 'Skidding', value: 'Skidding' },
            { label: 'Tire squeal', value: 'Tire squeal' },
            { label: 'Vehicle', value: 'Vehicle' },
          ]} />
        </div>
        <div className="w-36">
          <Input id="min-confidence" label="Min confidence" type="number" step="0.1" min="0" max="1" value={minConfidence} onChange={(e) => { setMinConfidence(e.target.value); setPage(1); }} placeholder="0.5" />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => { setFlaggedOnly(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            Flagged only
          </label>
        </div>
        {(search || className || minConfidence || flaggedOnly) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setClassName(''); setMinConfidence(''); setFlaggedOnly(false); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <ErrorState title="Failed to load crash logs" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={<Inbox size={40} />} title="No crash detection events" description="No YAMNet audio events match your filters." action={(search || className || minConfidence || flaggedOnly) ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setClassName(''); setMinConfidence(''); setFlaggedOnly(false); setPage(1); }}>Reset filters</Button> : undefined} />
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
      {data && data.total > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} options={[{ label: '10', value: '10' }, { label: '20', value: '20' }, { label: '50', value: '50' }, { label: '100', value: '100' }]} className="w-20" aria-label="Rows per page" />
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
    </div>
  );
}

// Suppress unused-import warning
void AudioLines;
