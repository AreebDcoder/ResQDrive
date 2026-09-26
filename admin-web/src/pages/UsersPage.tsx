import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, type ColumnDef, type SortingState, type RowSelectionState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  UserPlus, Inbox, MoreVertical, Eye, Power, Trash2, UserX, X,
} from 'lucide-react';
import { useUsers, useChangeUserStatus, useBulkDeactivate, useDeleteUser } from '../hooks/useUsers';
import type { User, UserRole } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cn } from '../lib/cn';

const ROLE_BADGE: Record<UserRole, { variant: 'neutral' | 'warning' | 'primary'; label: string }> = {
  DRIVER: { variant: 'primary', label: 'Driver' },
  MECHANIC: { variant: 'warning', label: 'Mechanic' },
  ADMIN: { variant: 'neutral', label: 'Admin' },
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [confirmBulkDeactivate, setConfirmBulkDeactivate] = useState(false);
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useUsers({
    page,
    limit: pageSize,
    role: roleFilter ? (roleFilter as UserRole) : undefined,
    isActive: statusFilter === '' ? undefined : statusFilter === 'active',
  });

  const statusMut = useChangeUserStatus();
  const bulkDeactivateMut = useBulkDeactivate();
  const deleteMut = useDeleteUser();

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      id: 'select',
      size: 36,
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all on page"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Select user ${row.original.fullName}`}
          checked={row.getIsSelected()}
          ref={(el) => { if (el) el.indeterminate = false; }}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/users/${row.original.id}`)}
          className="flex items-center gap-2.5 text-left hover:text-primary-700 dark:hover:text-primary-300"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
            {row.original.fullName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {row.original.fullName}
          </span>
        </button>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">{row.original.phoneNumber}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const r = ROLE_BADGE[row.original.role] || ROLE_BADGE.DRIVER;
        return <Badge variant={r.variant} size="sm">{r.label}</Badge>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'danger'} size="sm" dot>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button
          onClick={column.getToggleSortingHandler()}
          className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
        >
          Joined <ArrowUpDown size={12} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu
          userId={row.original.id}
          isActive={row.original.isActive}
          open={actionMenuFor === row.original.id}
          onOpenChange={(open) => setActionMenuFor(open ? row.original.id : null)}
          onView={() => { navigate(`/users/${row.original.id}`); setActionMenuFor(null); }}
          onToggleStatus={() => {
            statusMut.mutate({ id: row.original.id, isActive: !row.original.isActive });
            setActionMenuFor(null);
          }}
          onForceLogout={() => {
            // Force-logout is a small mutation — could be moved to its own menu item
            // but for now we'll navigate to detail page where the dedicated button lives.
            navigate(`/users/${row.original.id}`);
            setActionMenuFor(null);
          }}
          onDelete={() => { setConfirmDelete(row.original.id); setActionMenuFor(null); }}
        />
      ),
    },
  ], [navigate, actionMenuFor, statusMut]);

  const table = useReactTable({
    data: data?.users || [],
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: -1,
  });

  const selectedIds = Object.keys(rowSelection);
  const selectedCount = selectedIds.length;

  const handleBulkDeactivateConfirm = () => {
    bulkDeactivateMut.mutate(selectedIds, {
      onSettled: () => {
        setConfirmBulkDeactivate(false);
        setRowSelection({});
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!confirmDelete) return;
    deleteMut.mutate(confirmDelete, {
      onSettled: () => setConfirmDelete(null),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data?.meta?.total ?? '—'} users in system. {isFetching && !isLoading ? 'Syncing…' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/users/new')} leftIcon={<UserPlus size={14} />}>
          Create user
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Select
            id="role-filter"
            label="Role"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); setRowSelection({}); }}
            options={[
              { label: 'All roles', value: '' },
              { label: 'Driver', value: 'DRIVER' },
              { label: 'Mechanic', value: 'MECHANIC' },
              { label: 'Admin', value: 'ADMIN' },
            ]}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <Select
            id="status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); setRowSelection({}); }}
            options={[
              { label: 'All statuses', value: '' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </div>
        {(roleFilter || statusFilter) && (
          <Button
            variant="ghost"
            size="md"
            onClick={() => { setRoleFilter(''); setStatusFilter(''); setPage(1); }}
            leftIcon={<X size={14} />}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border border-warning-200 bg-warning-50 px-4 py-2 dark:border-warning-800 dark:bg-warning-900/20">
          <span className="text-sm font-medium text-warning-700 dark:text-warning-300">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="warning"
              size="sm"
              onClick={() => setConfirmBulkDeactivate(true)}
              leftIcon={<UserX size={14} />}
            >
              Bulk deactivate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})} aria-label="Clear selection">
              <X size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load users"
            description={error ? String(error) : undefined}
            onRetry={() => refetch()}
          />
        ) : !data || data.users.length === 0 ? (
          <EmptyState
            icon={<Inbox size={40} />}
            title="No users found"
            description="Try adjusting your filters, or create a new user."
            action={
              (roleFilter || statusFilter) ? (
                <Button variant="secondary" size="sm" onClick={() => { setRoleFilter(''); setStatusFilter(''); setPage(1); }}>
                  Reset filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/users/new')} leftIcon={<UserPlus size={14} />}>
                  Create user
                </Button>
              )
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
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      row.getIsSelected() && 'bg-primary-50/50 dark:bg-primary-900/10',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
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

      {/* Pagination */}
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

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmBulkDeactivate}
        onClose={() => setConfirmBulkDeactivate(false)}
        onConfirm={handleBulkDeactivateConfirm}
        loading={bulkDeactivateMut.isPending}
        title={`Deactivate ${selectedCount} user${selectedCount === 1 ? '' : 's'}?`}
        description="This will set isActive=false for all selected users AND revoke all their refresh tokens (immediate session termination). They will not be able to log in until reactivated. The accounts are not deleted — they can be reactivated any time."
        confirmLabel="Yes, deactivate"
        variant="warning"
        requireExplicitChoice
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteMut.isPending}
        title="Permanently delete this user?"
        description="This is a HARD DELETE. All incidents, vehicles, emergency contacts, and dispatch logs owned by this user will be permanently removed from the database. This action cannot be undone. Consider deactivating instead if you want to preserve the data."
        confirmLabel="Yes, delete permanently"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// ─── Action menu (kebab) ─────────────────────────────────────────────────────
interface ActionMenuProps {
  userId: string;
  isActive: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onView: () => void;
  onToggleStatus: () => void;
  onForceLogout: () => void;
  onDelete: () => void;
}

function ActionMenu({ isActive, open, onOpenChange, onView, onToggleStatus, onForceLogout, onDelete }: ActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); onOpenChange(!open); }}
        aria-label="Open actions menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <button
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Eye size={14} /> View details
          </button>
          <button
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Power size={14} /> {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); onForceLogout(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <UserX size={14} /> Force logout
          </button>
          <button
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex w-full items-center gap-2 border-t border-gray-200 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:border-gray-800 dark:text-danger-400 dark:hover:bg-danger-900/20"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// end of file
