import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, ShieldCheck } from 'lucide-react';
import { useCreateUser } from '../hooks/useUsers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';

/**
 * UserCreatePage — admin creates a new user (any role).
 *
 * Form fields:
 *   - fullName, email, phoneNumber, password (always required)
 *   - role (DRIVER / MECHANIC / ADMIN)
 *   - DRIVER: cnicNumber + drivingLicenseNumber (optional)
 *   - MECHANIC: workshopName + workshopAddress + specialization (optional)
 *
 * Uses local state (no react-hook-form yet — that comes in a later batch).
 * On submit → POST /admin/users → navigate to /users/:id (the new user's detail).
 *
 * Admin-created users are auto-verified (no email verification step).
 * Mechanics created here must still go through workshop approval workflow.
 */

interface FormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'DRIVER' | 'MECHANIC' | 'ADMIN';
  cnicNumber: string;
  drivingLicenseNumber: string;
  workshopName: string;
  workshopAddress: string;
  specialization: string;
}

const INITIAL: FormState = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  role: 'DRIVER',
  cnicNumber: '',
  drivingLicenseNumber: '',
  workshopName: '',
  workshopAddress: '',
  specialization: '',
};

export default function UserCreatePage() {
  const navigate = useNavigate();
  const createUserMut = useCreateUser();
  const [form, setForm] = useState<FormState>(INITIAL);

  const update = (field: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): string | null => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email is invalid.';
    if (!form.phoneNumber.trim()) return 'Phone number is required.';
    if (!/^\+?[1-9]\d{1,14}$/.test(form.phoneNumber)) return 'Phone must be E.164 format (e.g. +923001234567).';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (!/(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/.test(form.password)) {
      return 'Password must contain at least one number and one special character.';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      import('sonner').then(({ toast }) => toast.error(error));
      return;
    }
    // Build payload — only include role-specific fields if applicable
    const payload: any = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
      password: form.password,
      role: form.role,
      isVerified: true, // admin-created users skip email verification
    };
    if (form.role === 'DRIVER') {
      if (form.cnicNumber.trim()) payload.cnicNumber = form.cnicNumber.trim();
      if (form.drivingLicenseNumber.trim()) payload.drivingLicenseNumber = form.drivingLicenseNumber.trim();
    } else if (form.role === 'MECHANIC') {
      if (form.workshopName.trim()) payload.workshopName = form.workshopName.trim();
      if (form.workshopAddress.trim()) payload.workshopAddress = form.workshopAddress.trim();
      if (form.specialization.trim()) payload.specialization = form.specialization.trim();
    }

    createUserMut.mutate(payload, {
      onSuccess: (data) => {
        if (data?.user?.id) {
          navigate(`/users/${data.user.id}`);
        } else {
          navigate('/users');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create user</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Admin-created users are auto-verified (skip email verification).
            Mechanics still require workshop approval before they appear in driver search results.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/users')} leftIcon={<ArrowLeft size={14} />}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Core fields */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Account</h2>
          <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Required for all roles.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="fullName"
              label="Full name"
              type="text"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="John Doe"
              required
              autoFocus
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="john@resqdrive.com"
              required
            />
            <Input
              id="phoneNumber"
              label="Phone (E.164)"
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => update('phoneNumber', e.target.value)}
              placeholder="+923001234567"
              hint="Must be unique. E.164 format with country code."
              required
            />
            <Input
              id="password"
              label="Temporary password"
              type="text"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Min 8 chars, 1 number + 1 special"
              hint="User should change this on first login."
              required
            />
          </div>
          <div className="mt-4">
            <Select
              id="role"
              label="Role"
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              options={[
                { label: 'Driver', value: 'DRIVER' },
                { label: 'Mechanic', value: 'MECHANIC' },
                { label: 'Admin', value: 'ADMIN' },
              ]}
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Badge variant="success" size="sm" dot>Auto-verified</Badge>
              <span>Admin-created users skip email verification.</span>
            </div>
          </div>
        </div>

        {/* Role-specific fields */}
        {form.role === 'DRIVER' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Driver details</h2>
            <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-gray-400">Optional. Can be filled in later by the user.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="cnicNumber"
                label="CNIC"
                type="text"
                value={form.cnicNumber}
                onChange={(e) => update('cnicNumber', e.target.value)}
                placeholder="42101-1234567-1"
              />
              <Input
                id="drivingLicenseNumber"
                label="Driving license #"
                type="text"
                value={form.drivingLicenseNumber}
                onChange={(e) => update('drivingLicenseNumber', e.target.value)}
                placeholder="DL-987654321"
              />
            </div>
          </div>
        )}

        {form.role === 'MECHANIC' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Workshop details</h2>
            <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Optional at creation. Mechanic must submit workshop profile for admin approval before
              appearing in driver search results.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="workshopName"
                label="Workshop name"
                type="text"
                value={form.workshopName}
                onChange={(e) => update('workshopName', e.target.value)}
                placeholder="Auto Fix Workshop"
              />
              <Input
                id="specialization"
                label="Specialization"
                type="text"
                value={form.specialization}
                onChange={(e) => update('specialization', e.target.value)}
                placeholder="Engine Repair"
              />
              <div className="sm:col-span-2">
                <Input
                  id="workshopAddress"
                  label="Workshop address"
                  type="text"
                  value={form.workshopAddress}
                  onChange={(e) => update('workshopAddress', e.target.value)}
                  placeholder="123 Main St, Karachi"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Badge variant="warning" size="sm" dot>Pending approval</Badge>
              <span>New mechanic accounts must be approved via the Workshop Queue before they appear in driver search.</span>
            </div>
          </div>
        )}

        {form.role === 'ADMIN' && (
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-6 dark:border-warning-800 dark:bg-warning-900/20">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 text-warning-600 dark:text-warning-400" />
              <div>
                <h2 className="text-base font-semibold text-warning-800 dark:text-warning-200">Creating an admin account</h2>
                <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
                  This user will have full admin privileges — can manage other users, incidents,
                  vehicles, and system configuration. Audit this creation carefully.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/users')}>
            Cancel
          </Button>
          <Button type="submit" loading={createUserMut.isPending} leftIcon={<UserPlus size={14} />}>
            Create user
          </Button>
        </div>
      </form>
    </div>
  );
}
