import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, Camera, Key, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth';
import api from '../api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * ProfilePage — admin personal profile management.
 *
 * Features:
 *   - View profile (name, email, phone, role, verified, active, joined)
 *   - Edit profile (name + phone) — saves to PATCH /users/me
 *   - Change password — saves to PATCH /users/me/password (validates current pw)
 *   - Avatar upload — multipart POST /users/me/profile-picture
 *   - Logout button
 *
 * All operations use TanStack Query for cache + sonner toast for feedback.
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const qc = useQueryClient();

  // Fetch fresh profile (cache key 'me' — used in many places)
  const { data: profile, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>;
  }
  if (isError || !profile) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-300">
        Failed to load profile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My profile</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account settings.</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            {profile.profilePictureUrl ? (
              <img src={profile.profilePictureUrl} alt={profile.fullName} className="h-20 w-20 rounded-full object-cover ring-2 ring-primary-500" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border border-gray-200 bg-white p-1.5 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700" aria-label="Upload avatar">
              <Camera size={14} className="text-gray-600 dark:text-gray-300" />
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('Image must be under 5MB.');
                  return;
                }
                const formData = new FormData();
                formData.append('file', file);
                try {
                  const res = await api.post('/users/me/profile-picture', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  qc.setQueryData(['me'], (prev: any) => ({ ...prev, profilePictureUrl: res.data?.profilePictureUrl }));
                  toast.success('Avatar updated.');
                } catch (err: any) {
                  toast.error(err?.response?.data?.message || 'Avatar upload failed.');
                }
              }} />
            </label>
          </div>

          {/* Name + badges */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.fullName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="neutral" size="md">{profile.role}</Badge>
              <Badge variant={profile.isActive ? 'success' : 'danger'} size="md" dot>{profile.isActive ? 'Active' : 'Inactive'}</Badge>
              <Badge variant={profile.isVerified ? 'success' : 'warning'} size="md" dot>{profile.isVerified ? 'Verified' : 'Unverified'}</Badge>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} leftIcon={<Pencil size={14} />}>Edit</Button>
            <Button variant="secondary" size="sm" onClick={() => setPwOpen(true)} leftIcon={<Key size={14} />}>Change password</Button>
            <Button variant="ghost" size="sm" onClick={logout} leftIcon={<LogOut size={14} />}>Logout</Button>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 dark:border-gray-800 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Full name" value={profile.fullName} />
          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phoneNumber} />
          <Field label="Role" value={profile.role} />
          <Field label="Verified" value={profile.isVerified ? 'Yes' : 'No'} />
          <Field label="Active" value={profile.isActive ? 'Yes' : 'No'} />
          <Field label="Joined" value={new Date(profile.createdAt).toLocaleDateString()} />
          <Field label="User ID" value={profile.id} mono />
        </div>
      </div>

      {/* Edit modal */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSave={async (data) => {
          const res = await api.patch('/users/me', data);
          qc.setQueryData(['me'], res.data);
          toast.success('Profile updated.');
          setEditOpen(false);
        }}
      />

      {/* Password modal */}
      <ChangePasswordModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onSave={async ({ currentPassword, newPassword }) => {
          await api.patch('/users/me/password', { currentPassword, newPassword });
          toast.success('Password changed.');
          setPwOpen(false);
        }}
      />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={'mt-0.5 text-sm break-all text-gray-900 dark:text-gray-100 ' + (mono ? 'font-mono text-xs' : '')}>{value || '—'}</p>
    </div>
  );
}

function EditProfileModal({ open, onClose, profile, onSave }: {
  open: boolean;
  onClose: () => void;
  profile: any;
  onSave: (data: { fullName?: string; phoneNumber?: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile.fullName || '');
    setPhoneNumber(profile.phoneNumber || '');
  }, [profile, open]);

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" size="md">
      <div className="space-y-4">
        <Input id="edit-fullName" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        <Input id="edit-phone" label="Phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} hint="E.164 format (e.g. +923001234567)" />
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={async () => {
          setSaving(true);
          try {
            await onSave({ fullName, phoneNumber });
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Update failed.');
          } finally {
            setSaving(false);
          }
        }} leftIcon={<Save size={14} />}>Save</Button>
      </ModalFooter>
    </Modal>
  );
}

function ChangePasswordModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    }
  }, [open]);

  const passwordValid = newPassword.length >= 8 && /(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword);
  const passwordsMatch = newPassword === confirm;

  return (
    <Modal open={open} onClose={onClose} title="Change password" size="md" description="You'll need to log in again with the new password on other devices.">
      <div className="space-y-4">
        <Input id="current-pw" label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoFocus required />
        <Input
          id="new-pw"
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          hint="Min 8 chars, at least 1 number + 1 special char."
          error={newPassword && !passwordValid ? 'Doesn\'t meet complexity requirements.' : undefined}
          required
        />
        <Input
          id="confirm-pw"
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm && !passwordsMatch ? 'Passwords don\'t match.' : undefined}
          required
        />
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          loading={saving}
          disabled={!currentPassword || !passwordValid || !passwordsMatch}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({ currentPassword, newPassword });
            } catch (err: any) {
              toast.error(err?.response?.data?.message || 'Password change failed.');
            } finally {
              setSaving(false);
            }
          }}
          leftIcon={<CheckCircle2 size={14} />}
        >
          Change password
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Suppress unused-import warnings
void ArrowLeft; void useNavigate;
