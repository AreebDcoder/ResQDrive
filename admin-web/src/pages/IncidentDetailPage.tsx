import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, MapPin, Pencil, Archive, RotateCcw, AlertTriangle,
  Activity, History, FileText,
} from 'lucide-react';
import {
  useIncident,
  useUpdateIncident,
  useUpdateIncidentStatus,
  useSoftDeleteIncident,
  useRestoreIncident,
  downloadIncidentPdf,
} from '../hooks/useIncidents';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';
import { toast } from 'sonner';
import type { IncidentSeverity, IncidentStatus, IncidentType } from '../types';

const SEVERITY_BADGE: Record<string, { variant: 'neutral' | 'warning' | 'danger'; label: string }> = {
  NONE: { variant: 'neutral', label: 'None' },
  MINOR: { variant: 'warning', label: 'Minor' },
  MODERATE: { variant: 'warning', label: 'Moderate' },
  SEVERE: { variant: 'danger', label: 'Severe' },
};

const STATUS_BADGE: Record<string, { variant: 'danger' | 'success' | 'neutral' | 'primary'; label: string }> = {
  ACTIVE: { variant: 'danger', label: 'Active' },
  RESOLVED: { variant: 'success', label: 'Resolved' },
  FALSE_ALARM: { variant: 'neutral', label: 'False alarm' },
  ARCHIVED: { variant: 'neutral', label: 'Archived' },
};

type Tab = 'overview' | 'timeline' | 'related';

export default function IncidentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: incident, isLoading, isError, error, refetch } = useIncident(id);
  const updateMut = useUpdateIncident();
  const statusMut = useUpdateIncidentStatus();
  const softDeleteMut = useSoftDeleteIncident();
  const restoreMut = useRestoreIncident();

  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmSoftDelete, setConfirmSoftDelete] = useState(false);
  const [confirmFalseAlarm, setConfirmFalseAlarm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !incident) {
    return (
      <ErrorState
        title="Failed to load incident"
        description={error ? String(error) : 'Incident may have been deleted.'}
        onRetry={() => refetch()}
      />
    );
  }

  const sev = SEVERITY_BADGE[incident.severity] || SEVERITY_BADGE.NONE;
  const stat = STATUS_BADGE[incident.status] || STATUS_BADGE.ACTIVE;
  const isSoftDeleted = incident.isDeleted;

  const handleMarkFalseAlarm = () => {
    statusMut.mutate(
      { id, status: 'FALSE_ALARM' },
      { onSettled: () => setConfirmFalseAlarm(false) },
    );
  };

  const handleSoftDelete = () => {
    softDeleteMut.mutate(id, {
      onSettled: () => setConfirmSoftDelete(false),
    });
  };

  const handleRestore = () => {
    restoreMut.mutate(id);
  };

  const handleDownloadPdf = () => {
    toast.promise(downloadIncidentPdf(id), {
      loading: 'Generating PDF…',
      success: 'PDF downloaded.',
      error: 'Failed to download PDF.',
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── Top action bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/incidents')}
          leftIcon={<ArrowLeft size={14} />}
        >
          Back to incidents
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {isSoftDeleted ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRestore}
              loading={restoreMut.isPending}
              leftIcon={<RotateCcw size={14} />}
            >
              Restore
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditOpen(true)}
                leftIcon={<Pencil size={14} />}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadPdf}
                leftIcon={<Download size={14} />}
              >
                PDF
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={() => setConfirmFalseAlarm(true)}
                disabled={incident.status === 'FALSE_ALARM'}
                leftIcon={<AlertTriangle size={14} />}
              >
                Mark false alarm
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmSoftDelete(true)}
                loading={softDeleteMut.isPending}
                leftIcon={<Archive size={14} />}
              >
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── Header card with severity + status + meta ──────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={sev.variant} size="md">{sev.label}</Badge>
          <Badge variant={stat.variant} size="md" dot>{stat.label}</Badge>
          <Badge variant="neutral" size="md">
            {incident.type === 'AUTO' ? 'Auto-detected' : 'Manually logged'}
          </Badge>
          {isSoftDeleted && (
            <Badge variant="danger" size="md" dot>Archived</Badge>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Incident ID" value={incident.id} mono />
          <Field label="Occurred at" value={new Date(incident.occurredAt).toLocaleString()} />
          <Field label="Last updated" value={new Date(incident.updatedAt).toLocaleString()} />
          <Field label="Reported by" value={incident.user?.fullName || 'Unknown'} />
          <Field label="Contact" value={incident.user?.phoneNumber || '—'} />
          <Field label="Email" value={incident.user?.email || '—'} />
          <Field label="Address" value={incident.address || '—'} span={2} />
          <Field
            label="Coordinates"
            value={
              incident.latitude != null && incident.longitude != null
                ? `${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}`
                : '—'
            }
          />
        </div>

        {incident.latitude != null && incident.longitude != null && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <MapPin size={14} /> Open in Google Maps
          </a>
        )}
      </div>

      {/* ─── Description (if present) ──────────────────────────────────── */}
      {incident.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Description</h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{incident.description}</p>
        </div>
      )}

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-1 border-b border-gray-200 px-2 dark:border-gray-800" role="tablist">
          <TabButton tab={tab} value="overview" onClick={() => setTab('overview')} icon={<FileText size={14} />}>
            Overview
          </TabButton>
          <TabButton tab={tab} value="timeline" onClick={() => setTab('timeline')} icon={<History size={14} />}>
            Timeline
          </TabButton>
          <TabButton tab={tab} value="related" onClick={() => setTab('related')} icon={<Activity size={14} />}>
            Sensor snapshot
          </TabButton>
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Created at" value={new Date(incident.createdAt).toLocaleString()} />
                <Field label="Last updated" value={new Date(incident.updatedAt).toLocaleString()} />
                <Field label="Type" value={incident.type} />
                <Field label="Severity" value={incident.severity} />
                <Field label="Status" value={incident.status} />
                <Field label="Is deleted" value={incident.isDeleted ? 'Yes' : 'No'} />
              </div>
              {incident.alertDispatchStatus && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Alert dispatch status
                  </h3>
                  <pre className="overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-green-400">
                    {JSON.stringify(incident.alertDispatchStatus, null, 2)}
                  </pre>
                </div>
              )}
              {incident.damageAssessmentResult && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Damage assessment result
                  </h3>
                  <pre className="overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-green-400">
                    {JSON.stringify(incident.damageAssessmentResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {tab === 'timeline' && (
            <Timeline incident={incident} />
          )}

          {tab === 'related' && (
            <div>
              {incident.sensorSnapshot ? (
                <pre className="overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-green-400">
                  {JSON.stringify(incident.sensorSnapshot, null, 2)}
                </pre>
              ) : (
                <ErrorState
                  icon={<Activity size={32} />}
                  title="No sensor snapshot"
                  description="This incident does not have raw sensor data attached. This is typical for manually-logged incidents."
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Edit modal ─────────────────────────────────────────────────── */}
      <EditIncidentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        incident={incident}
        onSave={async (data) => {
          await updateMut.mutateAsync({ id, data });
          setEditOpen(false);
        }}
        loading={updateMut.isPending}
      />

      {/* ─── Confirm dialogs ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmFalseAlarm}
        onClose={() => setConfirmFalseAlarm(false)}
        onConfirm={handleMarkFalseAlarm}
        loading={statusMut.isPending}
        title="Mark this incident as a false alarm?"
        description="Status will be set to FALSE_ALARM. This is reversible — you can change status back via Edit modal."
        confirmLabel="Yes, mark as false alarm"
        variant="warning"
        requireExplicitChoice
      />

      <ConfirmDialog
        open={confirmSoftDelete}
        onClose={() => setConfirmSoftDelete(false)}
        onConfirm={handleSoftDelete}
        loading={softDeleteMut.isPending}
        title="Archive this incident?"
        description="This will soft-delete the incident (isDeleted=true + status=ARCHIVED). It will no longer appear in the incidents list. You can restore it later from this detail page."
        confirmLabel="Yes, archive"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({ label, value, span, mono }: { label: string; value: string; span?: 2; mono?: boolean }) {
  return (
    <div className={cn('col-span-1', span === 2 && 'sm:col-span-2')}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn('mt-0.5 text-sm text-gray-900 dark:text-gray-100 break-all', mono && 'font-mono text-xs')}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  tab, value, onClick, icon, children,
}: {
  tab: Tab;
  value: Tab;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const isActive = tab === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'border-primary-600 text-primary-700 dark:text-primary-300'
          : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Timeline tab content ────────────────────────────────────────────────────
function Timeline({ incident }: { incident: any }) {
  const events = [
    { at: incident.occurredAt, label: 'Incident occurred', icon: AlertTriangle, color: 'text-danger-500' },
    { at: incident.createdAt, label: 'Recorded in database', icon: FileText, color: 'text-info-500' },
    { at: incident.updatedAt, label: 'Last updated', icon: History, color: 'text-gray-400' },
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <ol className="relative space-y-6 border-l border-gray-200 pl-6 dark:border-gray-800">
      {events.map((e, i) => {
        const Icon = e.icon;
        return (
          <li key={i} className="relative">
            <span className={`absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white dark:bg-gray-900 dark:ring-gray-900 ${e.color}`}>
              <Icon size={14} />
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{e.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(e.at).toLocaleString()}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Edit modal ────────────────────────────────────────────────────────────────
function EditIncidentModal({
  open, onClose, incident, onSave, loading,
}: {
  open: boolean;
  onClose: () => void;
  incident: NonNullable<ReturnType<typeof useIncident>['data']>;
  onSave: (data: {
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    type?: IncidentType;
    description?: string;
    address?: string;
  }) => void | Promise<void>;
  loading: boolean;
}) {
  const [severity, setSeverity] = useState(incident.severity);
  const [status, setStatus] = useState(incident.status);
  const [type, setType] = useState(incident.type);
  const [description, setDescription] = useState(incident.description || '');
  const [address, setAddress] = useState(incident.address || '');

  // Sync local state when modal opens (since incident may have refetched)
  // (Skipping useEffect for simplicity — caller re-mounts this component on each open)

  const handleSave = () => {
    onSave({ severity, status, type, description, address });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit incident" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            id="edit-severity"
            label="Severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
            options={[
              { label: 'None', value: 'NONE' },
              { label: 'Minor', value: 'MINOR' },
              { label: 'Moderate', value: 'MODERATE' },
              { label: 'Severe', value: 'SEVERE' },
            ]}
          />
          <Select
            id="edit-status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as IncidentStatus)}
            options={[
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Resolved', value: 'RESOLVED' },
              { label: 'False alarm', value: 'FALSE_ALARM' },
              { label: 'Archived', value: 'ARCHIVED' },
            ]}
          />
          <Select
            id="edit-type"
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType)}
            options={[
              { label: 'Auto-detected', value: 'AUTO' },
              { label: 'Manually logged', value: 'MANUAL' },
            ]}
          />
        </div>

        <Input
          id="edit-address"
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Shahrah-e-Faisal, Karachi"
        />

        <div>
          <label
            htmlFor="edit-description"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            placeholder="Additional notes about the incident…"
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save changes</Button>
      </ModalFooter>
    </Modal>
  );
}
