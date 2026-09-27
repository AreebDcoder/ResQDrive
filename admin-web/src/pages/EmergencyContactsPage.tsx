import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, Pencil, Trash2, X,
} from 'lucide-react';
import { useEmergencyContacts, useUpdateContact, useDeleteContact } from '../hooks/useEmergencyContacts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type ContactWithUser = {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  relationship: string;
  priorityOrder: number;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; phoneNumber: string };
};

export default function EmergencyContactsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useEmergencyContacts({
    page,
    limit: pageSize,
    search: search || undefined,
  });

  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();

  const columns = useMemo<ColumnDef<ContactWithUser>[]>(() => [
    {
      accessorKey: 'priorityOrder',
      header: 'Pri',
      cell: ({ row }) => <Badge variant="neutral" size="sm">P{row.original.priorityOrder}</Badge>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">Name <ArrowUpDown size={12} /></button>
      ),
      cell: ({ row }) => <span className="font-medium text-gray-900 dark:text-white">{row.original.name}</span>,
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone',
      cell: ({ row }) => <span className="text-sm text-gray-600 dark:text-gray-300">{row.original.phoneNumber}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-sm text-gray-600 dark:text-gray-300">{row.original.email || '—'}</span>,
    },
    {
      accessorKey: 'relationship',
      header: 'Relationship',
      cell: ({ row }) => <Badge variant="info" size="sm">{row.original.relationship}</Badge>,
    },
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/users/${row.original.userId}`)} className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
          {row.original.user?.fullName || 'Unknown'}
        </button>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditContactId(row.original.id)} leftIcon={<Pencil size={12} />}>Edit</Button>
          <Button size="sm" variant="ghost" aria-label="Delete contact" onClick={() => setConfirmDelete(row.original.id)} className="h-8 w-8 p-0 text-danger-500 hover:text-danger-600">
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

  const editingContact = editContactId ? data?.data.find((c: any) => c.id === editContactId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency contacts</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.meta?.total ?? '—'} contacts across all users. {isFetching && !isLoading ? 'Syncing…' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name, phone, email, relationship, owner name/email..." leftIcon={<Search size={14} />} />
        </div>
        {search && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <ErrorState title="Failed to load contacts" description={error ? String(error) : undefined} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={<Inbox size={40} />} title="No contacts found" description="Try adjusting your search." action={search ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setPage(1); }}>Reset</Button> : undefined} />
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

      {/* Edit modal */}
      {editingContact && (
        <EditContactModal
          open={Boolean(editContactId)}
          contact={editingContact}
          onClose={() => setEditContactId(null)}
          onSave={async (data) => {
            await updateMut.mutateAsync({ id: editingContact.id, data });
            setEditContactId(null);
          }}
          loading={updateMut.isPending}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteMut.mutate(confirmDelete, { onSettled: () => setConfirmDelete(null) }); }}
        loading={deleteMut.isPending}
        title="Delete this emergency contact?"
        description="The remaining contacts owned by the same user will have their priorities automatically re-sequenced (1, 2, 3...) so there are no gaps. This cannot be undone."
        confirmLabel="Yes, delete"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditContactModal({ open, onClose, contact, onSave, loading }: { open: boolean; onClose: () => void; contact: any; onSave: (data: any) => void | Promise<void>; loading: boolean }) {
  const [name, setName] = useState(contact.name || '');
  const [phoneNumber, setPhoneNumber] = useState(contact.phoneNumber || '');
  const [email, setEmail] = useState(contact.email || '');
  const [relationship, setRelationship] = useState(contact.relationship || '');

  const handleSave = () => {
    onSave({
      name, phoneNumber, email: email || undefined, relationship,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit emergency contact" size="md">
      <div className="space-y-4">
        <Input id="contact-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input id="contact-phone" label="Phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} hint="Pakistani format accepted — will be normalized to E.164." placeholder="+923001234567" />
        <Input id="contact-email" label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input id="contact-relationship" label="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Father, Brother, Friend..." />
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save</Button>
      </ModalFooter>
    </Modal>
  );
}

// end of file
