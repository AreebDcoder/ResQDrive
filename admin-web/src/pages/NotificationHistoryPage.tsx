import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, X, Bell, Megaphone, CheckCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationHistory, useBroadcastNotification } from '../hooks/useAdminOps';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

type NotificationLog = {
  id: string;
  userId: string;
  category: string;
  title: string;
  body: string;
  isRead: boolean;
  deliveryStatus: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
};

const CATEGORY_VARIANT: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  driving_mode: 'info',
  alert_delivery_confirmation: 'success',
  false_alarm_log: 'warning',
  system_status: 'neutral',
  general: 'info',
};

export default function NotificationHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading, isError, error, refetch, isFetching } = useNotificationHistory({
    page,
    limit: pageSize,
    search: search || undefined,
    category: category || undefined,
    isRead: readFilter === '' ? undefined : readFilter === 'read',
  });

  const columns = useMemo<ColumnDef<NotificationLog>[]>(() => [
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
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => <Badge variant={CATEGORY_VARIANT[row.original.category] || 'neutral'} size="sm">{row.original.category}</Badge>,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="text-sm font-medium text-gray-900 dark:text-white">{row.original.title || '—'}</span>,
    },
    {
      accessorKey: 'body',
      header: 'Body',
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2" style={{ maxWidth: '320px' }}>{row.original.body || '—'}</span>,
    },
    {
      accessorKey: 'isRead',
      header: 'Read',
      cell: ({ row }) => <Badge variant={row.original.isRead ? 'success' : 'warning'} size="sm" dot>{row.original.isRead ? 'READ' : 'UNREAD'}</Badge>,
    },
    {
      accessorKey: 'deliveryStatus',
      header: 'Delivery',
      cell: ({ row }) => <Badge variant={row.original.deliveryStatus === 'sent' ? 'success' : 'danger'} size="sm">{row.original.deliveryStatus}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          Sent <ArrowUpDown size={12} />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification history</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data?.total ?? '—'} notifications sent. {isFetching && !isLoading ? 'Syncing…' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/notifications/broadcast')} leftIcon={<Megaphone size={14} />}>New broadcast</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Title, body, user name/email…" leftIcon={<Search size={14} />} />
        </div>
        <div className="w-44">
          <Select id="category" label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} options={[
            { label: 'All categories', value: '' },
            { label: 'general', value: 'general' },
            { label: 'system_status', value: 'system_status' },
            { label: 'driving_mode', value: 'driving_mode' },
            { label: 'alert_delivery_confirmation', value: 'alert_delivery_confirmation' },
            { label: 'false_alarm_log', value: 'false_alarm_log' },
          ]} />
        </div>
        <div className="w-36">
          <Select id="read" label="Read status" value={readFilter} onChange={(e) => { setReadFilter(e.target.value); setPage(1); }} options={[
            { label: 'All', value: '' },
            { label: 'Read only', value: 'read' },
            { label: 'Unread only', value: 'unread' },
          ]} />
        </div>
        {(search || category || readFilter) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setCategory(''); setReadFilter(''); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <ErrorState title="Failed to load notifications" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={<Bell size={40} />}
            title="No notifications"
            description="No notifications match your filters, or none have been sent yet."
            action={(search || category || readFilter) ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setCategory(''); setReadFilter(''); setPage(1); }}>Reset filters</Button> : <Button size="sm" onClick={() => navigate('/notifications/broadcast')} leftIcon={<Megaphone size={14} />}>New broadcast</Button>}
          />
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

// Suppress unused-import warnings
void CheckCheck; void Inbox;
