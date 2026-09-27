import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, X, History, Shield, User, FileWarning,
} from 'lucide-react';
import { useAuditLogs } from '../hooks/useAdminOps';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

type AuditLog = {
  id: string;
  adminUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  adminUser?: { id: string; fullName: string; email: string };
};

// Group actions by resource type for the badge color
const ACTION_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'> = {
  // Incident actions
  resolve_incident: 'success',
  update_incident: 'primary',
  update_incident_status: 'primary',
  soft_delete_incident: 'danger',
  restore_incident: 'success',
  bulk_resolve_incidents: 'success',
  bulk_delete_incidents: 'danger',
  // User actions
  create_user: 'success',
  change_user_role: 'warning',
  change_user_status: 'warning',
  update_user_profile: 'primary',
  force_logout_user: 'warning',
  verify_workshop: 'success',
  reject_workshop: 'danger',
  bulk_deactivate_users: 'warning',
  delete_user: 'danger',
};

const RESOURCE_TYPE_VARIANT: Record<string, 'info' | 'warning' | 'danger' | 'neutral' | 'primary'> = {
  Incident: 'info',
  User: 'warning',
  Vehicle: 'primary',
  EmergencyContact: 'neutral',
  AccidentReport: 'danger',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Split search into adminUserId (if it's a UUID) vs action search
  const adminUserId = useMemo(() => {
    if (!search) return undefined;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search)) {
      return search;
    }
    return undefined;
  }, [search]);

  const actionSearch = useMemo(() => {
    if (!search) return undefined;
    if (adminUserId) return undefined;
    return search;
  }, [search, adminUserId]);

  const { data, isLoading, isError, error, refetch, isFetching } = useAuditLogs({
    page,
    limit: pageSize,
    adminUserId,
    action: action || actionSearch,
    resourceType,
  });

  const columns = useMemo<ColumnDef<AuditLog>[]>(() => [
    {
      id: 'adminUser',
      header: 'Admin',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
            {row.original.adminUser?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">{row.original.adminUser?.fullName || 'Unknown'}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{row.original.adminUser?.email || ''}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Badge variant={ACTION_VARIANT[row.original.action] || 'neutral'} size="sm">
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: 'resourceType',
      header: 'Resource',
      cell: ({ row }) => (
        <Badge variant={RESOURCE_TYPE_VARIANT[row.original.resourceType] || 'neutral'} size="sm" dot>
          {row.original.resourceType}
        </Badge>
      ),
    },
    {
      accessorKey: 'resourceId',
      header: 'Resource ID',
      cell: ({ row }) => row.original.resourceId ? (
        <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{row.original.resourceId.slice(0, 8)}…</span>
      ) : <span className="text-[10px] text-gray-400">bulk (no ID)</span>,
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP',
      cell: ({ row }) => <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{row.original.ipAddress || '—'}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
          When <ArrowUpDown size={12} />
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit log</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.meta?.total ?? '—'} admin actions recorded. {isFetching && !isLoading ? 'Syncing…' : ''} Append-only — entries cannot be modified or deleted.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Action name, or admin user UUID…" leftIcon={<Search size={14} />} />
        </div>
        <div className="w-52">
          <Select id="action-filter" label="Action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} options={[
            { label: 'All actions', value: '' },
            { label: 'resolve_incident', value: 'resolve_incident' },
            { label: 'update_incident', value: 'update_incident' },
            { label: 'soft_delete_incident', value: 'soft_delete_incident' },
            { label: 'restore_incident', value: 'restore_incident' },
            { label: 'bulk_resolve_incidents', value: 'bulk_resolve_incidents' },
            { label: 'create_user', value: 'create_user' },
            { label: 'change_user_role', value: 'change_user_role' },
            { label: 'change_user_status', value: 'change_user_status' },
            { label: 'update_user_profile', value: 'update_user_profile' },
            { label: 'force_logout_user', value: 'force_logout_user' },
            { label: 'verify_workshop', value: 'verify_workshop' },
            { label: 'reject_workshop', value: 'reject_workshop' },
            { label: 'delete_user', value: 'delete_user' },
          ]} />
        </div>
        <div className="w-44">
          <Select id="resource-type" label="Resource type" value={resourceType} onChange={(e) => { setResourceType(e.target.value); setPage(1); }} options={[
            { label: 'All resources', value: '' },
            { label: 'Incident', value: 'Incident' },
            { label: 'User', value: 'User' },
            { label: 'Vehicle', value: 'Vehicle' },
            { label: 'EmergencyContact', value: 'EmergencyContact' },
            { label: 'AccidentReport', value: 'AccidentReport' },
          ]} />
        </div>
        {(search || action || resourceType) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setAction(''); setResourceType(''); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <ErrorState title="Failed to load audit log" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={<History size={40} />} title="No audit entries" description="No admin actions recorded yet, or no entries match your filters." action={(search || action || resourceType) ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setAction(''); setResourceType(''); setPage(1); }}>Reset filters</Button> : undefined} />
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
      {data && data.meta.total > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} options={[{ label: '10', value: '10' }, { label: '20', value: '20' }, { label: '50', value: '50' }, { label: '100', value: '100' }]} className="w-20" aria-label="Rows per page" />
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
    </div>
  );
}

// Suppress unused-import warnings
void Shield; void User; void FileWarning; void Inbox;
