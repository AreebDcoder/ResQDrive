import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Power, UserX, Activity, Car, Phone, History,
  CircleUser, AlertTriangle,
} from 'lucide-react';
import {
  useUserDetail,
  useUpdateUserProfile,
  useChangeUserStatus,
  useForceLogout,
} from '../hooks/useUsers';
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

const ROLE_BADGE: Record<string, { variant: 'neutral' | 'warning' | 'primary'; label: string }> = {
  DRIVER: { variant: 'primary', label: 'Driver' },
  MECHANIC: { variant: 'warning', label: 'Mechanic' },
  ADMIN: { variant: 'neutral', label: 'Admin' },
};

type Tab = 'profile' | 'incidents' | 'vehicles' | 'contacts';

export default function UserDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading, isError, error, refetch } = useUserDetail(id);
  const updateProfileMut = useUpdateUserProfile();
  const statusMut = useChangeUserStatus();
  const forceLogoutMut = useForceLogout();

  const [tab, setTab] = useState<Tab>('profile');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmForceLogout, setConfirmForceLogout] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !user) {
    return (
      <ErrorState
        title="Failed to load user"
        description={error ? String(error) : 'User may have been deleted.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/users')} leftIcon={<ArrowLeft size={14} />}>
          Back to users
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} leftIcon={<Pencil size={14} />}>
            Edit profile
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmForceLogout(true)}
            loading={forceLogoutMut.isPending}
            leftIcon={<UserX size={14} />}
          >
            Force logout
          </Button>
          <Button
            variant={user.isActive ? 'warning' : 'success'}
            size="sm"
            onClick={() => setConfirmDeactivate(true)}
            leftIcon={<Power size={14} />}
          >
            {user.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
            {user.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.fullName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ROLE_BADGE[user.role]?.variant || 'neutral'} size="md">
              {ROLE_BADGE[user.role]?.label || user.role}
            </Badge>
            <Badge variant={user.isActive ? 'success' : 'danger'} size="md" dot>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={user.isVerified ? 'success' : 'warning'} size="md">
              {user.isVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Phone" value={user.phoneNumber} />
          <Field label="Role" value={user.role} />
          <Field label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
          <Field label="Last updated" value={new Date(user.updatedAt).toLocaleDateString()} />
          {user.role === 'DRIVER' && user.driverDetails && (
            <>
              <Field label="CNIC" value={user.driverDetails.cnicNumber || '—'} />
              <Field label="License #" value={user.driverDetails.drivingLicenseNumber || '—'} />
            </>
          )}
          {user.role === 'MECHANIC' && user.mechanicDetails && (
            <>
              <Field label="Workshop" value={user.mechanicDetails.workshopName || '—'} />
              <Field label="Specialization" value={user.mechanicDetails.specialization || '—'} />
              <Field
                label="Workshop verified"
                value={user.mechanicDetails.isWorkshopVerified ? 'Yes' : 'No'}
              />
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-1 border-b border-gray-200 px-2 dark:border-gray-800" role="tablist">
          <TabButton tab={tab} value="profile" onClick={() => setTab('profile')} icon={<CircleUser size={14} />}>
            Profile
          </TabButton>
          <TabButton tab={tab} value="incidents" onClick={() => setTab('incidents')} icon={<AlertTriangle size={14} />}>
            Incidents ({user.incidents?.length || 0})
          </TabButton>
          <TabButton tab={tab} value="vehicles" onClick={() => setTab('vehicles')} icon={<Car size={14} />}>
            Vehicles ({user.vehicles?.length || 0})
          </TabButton>
          <TabButton tab={tab} value="contacts" onClick={() => setTab('contacts')} icon={<Phone size={14} />}>
            Contacts ({user.contacts?.length || 0})
          </TabButton>
        </div>

        <div className="p-6">
          {tab === 'profile' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" value={user.fullName} />
              <Field label="Email" value={user.email} />
              <Field label="Phone" value={user.phoneNumber} />
              <Field label="Role" value={user.role} />
              <Field label="Is verified" value={user.isVerified ? 'Yes' : 'No'} />
              <Field label="Is active" value={user.isActive ? 'Yes' : 'No'} />
              <Field label="Profile picture URL" value={user.profilePictureUrl || '—'} span={3} />
              <Field label="Created at" value={new Date(user.createdAt).toLocaleString()} />
              <Field label="Updated at" value={new Date(user.updatedAt).toLocaleString()} />
              <Field label="User ID" value={user.id} mono />
            </div>
          )}

          {tab === 'incidents' && (
            (user.incidents?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<AlertTriangle size={32} />}
                title="No incidents"
                description="This user has not been involved in any recorded incidents."
              />
            ) : (
              <div className="space-y-2">
                {user.incidents.map((inc: any) => (
                  <button
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-primary-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={inc.severity === 'SEVERE' ? 'danger' : inc.severity === 'MODERATE' ? 'warning' : 'neutral'} size="sm">
                        {inc.severity}
                      </Badge>
                      <Badge variant="neutral" size="sm">{inc.status}</Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{inc.address || 'No address'}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(inc.occurredAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {tab === 'vehicles' && (
            (user.vehicles?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Car size={32} />}
                title="No vehicles"
                description="This user has not registered any vehicles."
              />
            ) : (
              <div className="space-y-2">
                {user.vehicles.map((v: any) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Car size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {v.make} {v.model} ({v.year})
                        </span>
                        {v.isPrimary && <Badge variant="success" size="sm">Primary</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Plate: {v.licensePlate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'contacts' && (
            (user.contacts?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Phone size={32} />}
                title="No emergency contacts"
                description="This user has not added any emergency contacts."
              />
            ) : (
              <div className="space-y-2">
                {user.contacts.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        <span className="text-xs text-gray-400">P{c.priorityOrder}:</span>{' '}
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {c.phoneNumber} • {c.relationship}
                        {c.email && ` • ${c.email}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
        onSave={async (data) => {
          await updateProfileMut.mutateAsync({ id, data });
          setEditOpen(false);
        }}
        loading={updateProfileMut.isPending}
      />

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmForceLogout}
        onClose={() => setConfirmForceLogout(false)}
        onConfirm={() => forceLogoutMut.mutate(id, { onSettled: () => setConfirmForceLogout(false) })}
        loading={forceLogoutMut.isPending}
        title="Force logout all sessions?"
        description="This revokes ALL refresh tokens for this user. Their current access token (15-min lifetime) continues to work until expiry, but they will not be able to refresh and will be kicked out on the next API call after that."
        confirmLabel="Yes, force logout"
        variant="warning"
        requireExplicitChoice
      />

      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => statusMut.mutate({ id, isActive: !user.isActive }, { onSettled: () => setConfirmDeactivate(false) })}
        loading={statusMut.isPending}
        title={user.isActive ? 'Deactivate this user?' : 'Activate this user?'}
        description={user.isActive
          ? 'This sets isActive=false AND revokes all their refresh tokens. The user cannot log in until reactivated. The account and all its data are preserved.'
          : 'This sets isActive=true. The user can log in again immediately.'}
        confirmLabel={user.isActive ? 'Yes, deactivate' : 'Yes, activate'}
        variant={user.isActive ? 'warning' : 'primary'}
        requireExplicitChoice={user.isActive}
      />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({ label, value, span, mono }: { label: string; value: string; span?: number; mono?: boolean }) {
  return (
    <div className={cn(span === 3 && 'sm:col-span-2 lg:col-span-3')}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn('mt-0.5 text-sm text-gray-900 break-all dark:text-gray-100', mono && 'font-mono text-xs')}>
        {value || '—'}
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

// ─── Edit profile modal ───────────────────────────────────────────────────────
function EditProfileModal({
  open, onClose, user, onSave, loading,
}: {
  open: boolean;
  onClose: () => void;
  user: any;
  onSave: (data: any) => void | Promise<void>;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [cnicNumber, setCnicNumber] = useState(user.driverDetails?.cnicNumber || '');
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState(user.driverDetails?.drivingLicenseNumber || '');
  const [workshopName, setWorkshopName] = useState(user.mechanicDetails?.workshopName || '');
  const [workshopAddress, setWorkshopAddress] = useState(user.mechanicDetails?.workshopAddress || '');
  const [specialization, setSpecialization] = useState(user.mechanicDetails?.specialization || '');

  const isDriver = user.role === 'DRIVER';
  const isMechanic = user.role === 'MECHANIC';

  const handleSave = () => {
    const data: any = { fullName, email, phoneNumber };
    if (isDriver) {
      if (cnicNumber !== '') data.cnicNumber = cnicNumber;
      if (drivingLicenseNumber !== '') data.drivingLicenseNumber = drivingLicenseNumber;
    }
    if (isMechanic) {
      if (workshopName !== '') data.workshopName = workshopName;
      if (workshopAddress !== '') data.workshopAddress = workshopAddress;
      if (specialization !== '') data.specialization = specialization;
    }
    onSave(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="edit-fullName" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input id="edit-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Input id="edit-phone" label="Phone (E.164)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+923001234567" />

        {isDriver && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-200 pt-4 dark:border-gray-800">
            <Input id="edit-cnic" label="CNIC" value={cnicNumber} onChange={(e) => setCnicNumber(e.target.value)} placeholder="42101-1234567-1" />
            <Input id="edit-license" label="Driving license #" value={drivingLicenseNumber} onChange={(e) => setDrivingLicenseNumber(e.target.value)} />
          </div>
        )}

        {isMechanic && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-200 pt-4 dark:border-gray-800">
            <Input id="edit-workshop-name" label="Workshop name" value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} />
            <Input id="edit-specialization" label="Specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            <div className="sm:col-span-2">
              <Input id="edit-workshop-address" label="Workshop address" value={workshopAddress} onChange={(e) => setWorkshopAddress(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save changes</Button>
      </ModalFooter>
    </Modal>
  );
}

// Suppress unused-import warning
void Activity; void History;
