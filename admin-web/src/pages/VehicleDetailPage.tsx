import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Star, Car, Shield, AlertTriangle, FileText, Activity, History, Inbox,
} from 'lucide-react';
import {
  useVehicleDetail,
  useUpdateVehicle,
  useSetPrimaryVehicle,
  useDeleteVehicle,
  useUpsertInsurance,
} from '../hooks/useVehicles';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/cn';
import { toast } from 'sonner';

type Tab = 'overview' | 'damage' | 'repair' | 'incidents';

export default function VehicleDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle, isLoading, isError, error, refetch } = useVehicleDetail(id);
  const updateMut = useUpdateVehicle();
  const setPrimaryMut = useSetPrimaryVehicle();
  const deleteMut = useDeleteVehicle();
  const insuranceMut = useUpsertInsurance();

  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !vehicle) {
    return (
      <ErrorState title="Failed to load vehicle" description={error ? String(error) : undefined} onRetry={() => refetch()} />
    );
  }

  const hasInsurance = Boolean(vehicle.insurance);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/vehicles')} leftIcon={<ArrowLeft size={14} />}>
          Back to vehicles
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} leftIcon={<Pencil size={14} />}>Edit</Button>
          <Button variant="secondary" size="sm" onClick={() => setInsuranceOpen(true)} leftIcon={<Shield size={14} />}>
            {hasInsurance ? 'Edit insurance' : 'Add insurance'}
          </Button>
          {!vehicle.isPrimary && (
            <Button variant="secondary" size="sm" onClick={() => setPrimaryMut.mutate(id)} loading={setPrimaryMut.isPending} leftIcon={<Star size={14} />}>
              Set as primary
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} leftIcon={<AlertTriangle size={14} />}>
            Delete
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            <Car size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Owner: {vehicle.user?.fullName || 'Unknown'} • {vehicle.user?.email || ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" size="md">{vehicle.licensePlate}</Badge>
            {vehicle.isPrimary && <Badge variant="success" size="md" dot>Primary</Badge>}
            {hasInsurance ? <Badge variant="info" size="md" dot>Insured</Badge> : <Badge variant="warning" size="md">No insurance</Badge>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Make" value={vehicle.make} />
          <Field label="Model" value={vehicle.model} />
          <Field label="Year" value={String(vehicle.year)} />
          <Field label="Color" value={vehicle.color || '—'} />
          <Field label="License plate" value={vehicle.licensePlate} />
          <Field label="Is primary" value={vehicle.isPrimary ? 'Yes' : 'No'} />
          <Field label="Created at" value={new Date(vehicle.createdAt).toLocaleString()} />
          <Field label="Updated at" value={new Date(vehicle.updatedAt).toLocaleString()} />
          <Field label="Vehicle ID" value={vehicle.id} mono />
        </div>

        {/* Insurance card (if present) */}
        {vehicle.insurance && (
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Insurance</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <Field label="Provider" value={vehicle.insurance.providerName || '—'} />
              <Field label="Policy #" value={vehicle.insurance.policyNumber || '—'} />
              <Field label="Coverage" value={vehicle.insurance.coverageType || '—'} />
              <Field label="Expiry" value={vehicle.insurance.expiryDate ? new Date(vehicle.insurance.expiryDate).toLocaleDateString() : '—'} />
              <Field label="Emergency helpline" value={vehicle.insurance.emergencyHelpline || '—'} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-1 border-b border-gray-200 px-2 dark:border-gray-800" role="tablist">
          <TabButton tab={tab} value="overview" onClick={() => setTab('overview')} icon={<FileText size={14} />}>Overview</TabButton>
          <TabButton tab={tab} value="damage" onClick={() => setTab('damage')} icon={<AlertTriangle size={14} />}>Damage ({vehicle.damageAssessments?.length || 0})</TabButton>
          <TabButton tab={tab} value="repair" onClick={() => setTab('repair')} icon={<FileText size={14} />}>Repair reports ({vehicle.repairCostReports?.length || 0})</TabButton>
          <TabButton tab={tab} value="incidents" onClick={() => setTab('incidents')} icon={<History size={14} />}>Recent incidents ({vehicle.recentIncidents?.length || 0})</TabButton>
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Make" value={vehicle.make} />
                <Field label="Model" value={vehicle.model} />
                <Field label="Year" value={String(vehicle.year)} />
                <Field label="Color" value={vehicle.color || '—'} />
                <Field label="License plate" value={vehicle.licensePlate} />
                <Field label="Is primary" value={vehicle.isPrimary ? 'Yes' : 'No'} />
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Owner</h3>
                <button onClick={() => navigate(`/users/${vehicle.userId}`)} className="flex items-center gap-2 hover:text-primary-700 dark:hover:text-primary-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                    {vehicle.user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{vehicle.user?.fullName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{vehicle.user?.email || ''}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === 'damage' && (
            (vehicle.damageAssessments?.length ?? 0) === 0 ? (
              <EmptyState icon={<AlertTriangle size={32} />} title="No damage assessments" description="This vehicle has not been assessed for damage." />
            ) : (
              <div className="space-y-2">
                {vehicle.damageAssessments.map((d: any) => (
                  <button key={d.id} onClick={() => navigate(`/damage`)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-primary-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <img src={d.photoUrl} alt="Damage" className="h-10 w-10 rounded object-cover" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{d.predictedDamageType}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{d.partTag} • {Math.round(d.confidenceScore * 100)}% confidence</p>
                      </div>
                    </div>
                    <Badge variant={d.derivedSeverity === 'severe' ? 'danger' : d.derivedSeverity === 'moderate' ? 'warning' : 'neutral'} size="sm">{d.derivedSeverity}</Badge>
                  </button>
                ))}
              </div>
            )
          )}

          {tab === 'repair' && (
            (vehicle.repairCostReports?.length ?? 0) === 0 ? (
              <EmptyState icon={<FileText size={32} />} title="No repair cost reports" description="No repair cost estimates have been generated for this vehicle." />
            ) : (
              <div className="space-y-2">
                {vehicle.repairCostReports.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Rs. {r.totalMinCostPkr?.toLocaleString()} – {r.totalMaxCostPkr?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    {r.pdfUrl && (
                      <Button size="sm" variant="secondary" onClick={() => window.open(r.pdfUrl, '_blank')}>PDF</Button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'incidents' && (
            (vehicle.recentIncidents?.length ?? 0) === 0 ? (
              <EmptyState icon={<History size={32} />} title="No recent incidents" description="This vehicle's owner has no recorded incidents (in the last 5)." />
            ) : (
              <div className="space-y-2">
                {vehicle.recentIncidents.map((inc: any) => (
                  <button key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-primary-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <Badge variant={inc.severity === 'SEVERE' ? 'danger' : inc.severity === 'MODERATE' ? 'warning' : 'neutral'} size="sm">{inc.severity}</Badge>
                      <Badge variant="neutral" size="sm">{inc.status}</Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{inc.address || 'No address'}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(inc.occurredAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EditVehicleModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        vehicle={vehicle}
        onSave={async (data) => {
          await updateMut.mutateAsync({ id, data });
          setEditOpen(false);
        }}
        loading={updateMut.isPending}
      />

      {/* Insurance modal */}
      <InsuranceModal
        open={insuranceOpen}
        onClose={() => setInsuranceOpen(false)}
        insurance={vehicle.insurance}
        onSave={async (data) => {
          await insuranceMut.mutateAsync({ vehicleId: id, data });
          setInsuranceOpen(false);
        }}
        loading={insuranceMut.isPending}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMut.mutate(id, { onSuccess: () => navigate('/vehicles'), onSettled: () => setConfirmDelete(false) })}
        loading={deleteMut.isPending}
        title="Permanently delete this vehicle?"
        description="This deletes the vehicle record AND its insurance record (cascade). Linked damage assessments, repair cost reports, and accident reports are preserved but lose their vehicleId reference. This cannot be undone."
        confirmLabel="Yes, delete"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({ label, value, span, mono }: { label: string; value: string; span?: number; mono?: boolean }) {
  return (
    <div className={cn(span === 3 && 'sm:col-span-2 lg:col-span-3')}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn('mt-0.5 text-sm text-gray-900 break-all dark:text-gray-100', mono && 'font-mono text-xs')}>{value || '—'}</p>
    </div>
  );
}

function TabButton({ tab, value, onClick, icon, children }: { tab: Tab; value: Tab; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  const isActive = tab === value;
  return (
    <button role="tab" aria-selected={isActive} onClick={onClick} className={cn('inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'border-primary-600 text-primary-700 dark:text-primary-300' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white')}>
      {icon}
      {children}
    </button>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditVehicleModal({ open, onClose, vehicle, onSave, loading }: { open: boolean; onClose: () => void; vehicle: any; onSave: (data: any) => void | Promise<void>; loading: boolean }) {
  const [make, setMake] = useState(vehicle.make || '');
  const [model, setModel] = useState(vehicle.model || '');
  const [year, setYear] = useState(String(vehicle.year || ''));
  const [color, setColor] = useState(vehicle.color || '');
  const [licensePlate, setLicensePlate] = useState(vehicle.licensePlate || '');

  const handleSave = () => {
    onSave({
      make, model,
      year: year ? Number(year) : undefined,
      color: color || undefined,
      licensePlate,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit vehicle" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="edit-make" label="Make" value={make} onChange={(e) => setMake(e.target.value)} />
          <Input id="edit-model" label="Model" value={model} onChange={(e) => setModel(e.target.value)} />
          <Input id="edit-year" label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          <Input id="edit-color" label="Color" value={color} onChange={(e) => setColor(e.target.value)} />
          <div className="sm:col-span-2">
            <Input id="edit-plate" label="License plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} hint="3-15 chars, letters/numbers/spaces/dashes only." />
          </div>
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save changes</Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Insurance modal ──────────────────────────────────────────────────────────
function InsuranceModal({ open, onClose, insurance, onSave, loading }: { open: boolean; onClose: () => void; insurance: any; onSave: (data: any) => void | Promise<void>; loading: boolean }) {
  const [providerName, setProviderName] = useState(insurance?.providerName || '');
  const [policyNumber, setPolicyNumber] = useState(insurance?.policyNumber || '');
  const [coverageType, setCoverageType] = useState(insurance?.coverageType || '');
  const [expiryDate, setExpiryDate] = useState(insurance?.expiryDate ? insurance.expiryDate.slice(0, 10) : '');
  const [emergencyHelpline, setEmergencyHelpline] = useState(insurance?.emergencyHelpline || '');

  const handleSave = () => {
    onSave({
      providerName: providerName || undefined,
      policyNumber: policyNumber || undefined,
      coverageType: coverageType || undefined,
      expiryDate: expiryDate || undefined,
      emergencyHelpline: emergencyHelpline || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Insurance details" description="Admin override — admin can edit any user's insurance." size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="ins-provider" label="Provider" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Jubilee Insurance" />
          <Input id="ins-policy" label="Policy #" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} placeholder="JL-987654321" />
          <Input id="ins-coverage" label="Coverage type" value={coverageType} onChange={(e) => setCoverageType(e.target.value)} placeholder="Comprehensive" />
          <Input id="ins-expiry" label="Expiry date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          <div className="sm:col-span-2">
            <Input id="ins-helpline" label="Emergency helpline" value={emergencyHelpline} onChange={(e) => setEmergencyHelpline(e.target.value)} placeholder="0800-12345" />
          </div>
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save</Button>
      </ModalFooter>
    </Modal>
  );
}

// Suppress unused-import warnings
void Activity; void Inbox;
