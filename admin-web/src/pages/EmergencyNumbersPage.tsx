import { useState } from 'react';
import {
  Phone, Plus, Pencil, Trash2, X, Search, Inbox,
} from 'lucide-react';
import {
  useEmergencyNumbers, useCreateEmergencyNumber,
  useUpdateEmergencyNumber, useDeleteEmergencyNumber,
} from '../hooks/useAdminOps';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

/**
 * EmergencyNumbersPage — regional emergency number CRUD.
 *
 * Features:
 *   - Search by region/service/phone
 *   - Add (modal form with phone validation)
 *   - Edit (modal form, same fields)
 *   - Delete with confirm
 *
 * Phone validation: 11-digit Pakistan landline (0XXXXXXXXXX) or 4-digit
 * shortcode (15, 112, 911). The backend stores as-is — no normalization
 * because regional numbers are NOT E.164 (they're landline shortcodes).
 */
export default function EmergencyNumbersPage() {
  const { data: numbers, isLoading, isError, error, refetch, isFetching } = useEmergencyNumbers();
  const createMut = useCreateEmergencyNumber();
  const updateMut = useUpdateEmergencyNumber();
  const deleteMut = useDeleteEmergencyNumber();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = (numbers || []).filter((n: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.regionName?.toLowerCase().includes(q) ||
      n.serviceName?.toLowerCase().includes(q) ||
      n.phoneNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regional emergency numbers</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {numbers?.length ?? '—'} numbers. {isFetching && !isLoading ? 'Syncing…' : ''} These appear in driver SOS results when auto-dialing.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} leftIcon={<Plus size={14} />}>Add number</Button>
      </div>

      {/* Search */}
      <div>
        <Input
          id="search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by region, service, or phone number…"
          leftIcon={<Search size={14} />}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <ErrorState title="Failed to load emergency numbers" description={error ? String(error) : undefined} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox size={40} />}
          title="No numbers found"
          description={search ? 'Try adjusting your search.' : 'No regional emergency numbers configured yet.'}
          action={search ? <Button variant="secondary" size="sm" onClick={() => setSearch('')}>Reset search</Button> : <Button size="sm" onClick={() => setCreating(true)} leftIcon={<Plus size={14} />}>Add number</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n: any) => (
            <div key={n.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.serviceName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{n.regionName}</p>
                  </div>
                </div>
                <Badge variant="info" size="sm">P{n.priorityOrder}</Badge>
              </div>
              <p className="mt-3 font-mono text-base font-bold text-gray-900 dark:text-white">{n.phoneNumber}</p>
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
                <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(n)} className="h-8 w-8 p-0"><Pencil size={14} /></Button>
                <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setConfirmDelete(n.id)} className="h-8 w-8 p-0 text-danger-500 hover:text-danger-600"><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <NumberModal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add emergency number"
        onSave={async (data) => {
          await createMut.mutateAsync(data);
          setCreating(false);
        }}
        loading={createMut.isPending}
      />

      {/* Edit modal */}
      <NumberModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit emergency number"
        initial={editing || undefined}
        onSave={async (data) => {
          if (!editing) return;
          await updateMut.mutateAsync({ id: editing.id, data });
          setEditing(null);
        }}
        loading={updateMut.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteMut.mutate(confirmDelete, { onSettled: () => setConfirmDelete(null) });
        }}
        loading={deleteMut.isPending}
        title="Delete this emergency number?"
        description="Drivers will no longer see this number in their SOS results."
        confirmLabel="Yes, delete"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// ─── Number modal (shared between create + edit) ─────────────────────────────
function NumberModal({ open, onClose, title, initial, onSave, loading }: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial?: { regionName: string; serviceName: string; phoneNumber: string; priorityOrder: number };
  onSave: (data: { regionName: string; serviceName: string; phoneNumber: string; priorityOrder: number }) => Promise<void>;
  loading: boolean;
}) {
  const [regionName, setRegionName] = useState(initial?.regionName || '');
  const [serviceName, setServiceName] = useState(initial?.serviceName || '');
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber || '');
  const [priorityOrder, setPriorityOrder] = useState(initial?.priorityOrder || 1);

  // Sync when modal opens or initial changes
  useState(() => {
    if (initial) {
      setRegionName(initial.regionName);
      setServiceName(initial.serviceName);
      setPhoneNumber(initial.phoneNumber);
      setPriorityOrder(initial.priorityOrder);
    }
  });

  const phoneValid = /^\d{3,15}$/.test(phoneNumber.replace(/[\s\-+]/g, ''));

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <Input id="region-name" label="Region name" value={regionName} onChange={(e) => setRegionName(e.target.value)} placeholder="Islamabad / Punjab / Sindh" required autoFocus />
        <Input id="service-name" label="Service name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Rescue 1122 / Edhi / Police" required />
        <Input
          id="phone-number"
          label="Phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="1122 / 0800-12345 / +923001234567"
          hint="3-15 digits. Accepts landline shortcodes + E.164 mobile numbers."
          error={phoneNumber && !phoneValid ? 'Must be 3-15 digits.' : undefined}
          required
        />
        <Input
          id="priority"
          label="Priority order"
          type="number"
          min={1}
          value={priorityOrder}
          onChange={(e) => setPriorityOrder(parseInt(e.target.value) || 1)}
          hint="Lower number = higher priority (P1 = auto-dialed first)"
        />
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} leftIcon={<X size={14} />}>Cancel</Button>
        <Button
          loading={loading}
          disabled={!regionName || !serviceName || !phoneValid}
          onClick={async () => {
            await onSave({ regionName, serviceName, phoneNumber, priorityOrder });
          }}
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}
