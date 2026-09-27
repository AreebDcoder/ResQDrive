import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, X, Mic,
} from 'lucide-react';
import { useVoiceLogs } from '../hooks/useTelemetry';
import { ChartContainer } from '../components/charts/ChartContainer';
import { DonutChart } from '../components/charts/DonutChart';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

type VoiceLog = {
  id: string;
  userId: string;
  rawTranscript: string;
  classifiedIntent: 'cancel' | 'sos' | 'unknown';
  recognitionEngine: string;
  actionTaken: boolean;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
};

const INTENT_COLORS: Record<string, string> = {
  cancel: '#ef4444',
  sos: '#10b981',
  unknown: '#9ca3af',
};

export default function VoiceCommandLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [intent, setIntent] = useState('');
  const [engine, setEngine] = useState('');
  const [actionTakenOnly, setActionTakenOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading, isError, error, refetch, isFetching } = useVoiceLogs({
    page,
    limit: pageSize,
    search: search || undefined,
    intent: intent || undefined,
    engine: engine || undefined,
    actionTakenOnly: actionTakenOnly || undefined,
  });

  const columns = useMemo<ColumnDef<VoiceLog>[]>(() => [
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
      accessorKey: 'classifiedIntent',
      header: 'Intent',
      cell: ({ row }) => {
        const i = row.original.classifiedIntent;
        const color = INTENT_COLORS[i] || '#9ca3af';
        return (
          <Badge variant={i === 'sos' ? 'success' : i === 'cancel' ? 'danger' : 'neutral'} size="sm" dot>
            {i}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'rawTranscript',
      header: 'Transcript',
      cell: ({ row }) => (
        <span className="text-sm italic text-gray-700 dark:text-gray-200 line-clamp-2" style={{ maxWidth: '320px' }}>
          "{row.original.rawTranscript || '—'}"
        </span>
      ),
    },
    {
      accessorKey: 'recognitionEngine',
      header: 'Engine',
      cell: ({ row }) => <Badge variant="info" size="sm">{row.original.recognitionEngine || 'N/A'}</Badge>,
    },
    {
      accessorKey: 'actionTaken',
      header: 'Action taken',
      cell: ({ row }) => <Badge variant={row.original.actionTaken ? 'success' : 'neutral'} size="sm" dot>{row.original.actionTaken ? 'YES' : 'NO'}</Badge>,
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

  // Intent distribution data for donut chart (current page)
  const donutData = useMemo(() => {
    const counts: Record<string, number> = { cancel: 0, sos: 0, unknown: 0 };
    (data?.data || []).forEach((l: any) => {
      counts[l.classifiedIntent] = (counts[l.classifiedIntent] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: INTENT_COLORS[name] || '#9ca3af',
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice command logs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.total ?? '—'} voice command events from mobile. {isFetching && !isLoading ? 'Syncing…' : ''}
        </p>
      </div>

      {/* Intent distribution donut chart */}
      <ChartContainer title="Intent distribution (current page)" description="How voice commands are classified on this page" isLoading={isLoading} isEmpty={donutData.every((d) => d.value === 0)} height={240}>
        <DonutChart data={donutData} />
      </ChartContainer>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Transcript, user name, user email..." leftIcon={<Search size={14} />} />
        </div>
        <div className="w-36">
          <Select id="intent" label="Intent" value={intent} onChange={(e) => { setIntent(e.target.value); setPage(1); }} options={[
            { label: 'All intents', value: '' },
            { label: 'cancel', value: 'cancel' },
            { label: 'sos', value: 'sos' },
            { label: 'unknown', value: 'unknown' },
          ]} />
        </div>
        <div className="w-36">
          <Input id="engine" label="Engine" type="text" value={engine} onChange={(e) => { setEngine(e.target.value); setPage(1); }} placeholder="native, vosk_offline..." />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={actionTakenOnly} onChange={(e) => { setActionTakenOnly(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            Action taken only
          </label>
        </div>
        {(search || intent || engine || actionTakenOnly) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setIntent(''); setEngine(''); setActionTakenOnly(false); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <ErrorState title="Failed to load voice logs" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={<Inbox size={40} />} title="No voice commands" description="No voice command events match your filters." action={(search || intent || engine || actionTakenOnly) ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setIntent(''); setEngine(''); setActionTakenOnly(false); setPage(1); }}>Reset filters</Button> : undefined} />
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
void Mic;
