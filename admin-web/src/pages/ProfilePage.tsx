import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import type { User } from '../types';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/users/me');
        setProfile(res.data);
        setFullName(res.data.fullName);
        setPhoneNumber(res.data.phoneNumber);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.patch('/users/me', { fullName, phoneNumber });
      setProfile(res.data);
      setIsEditing(false);
      setSaveMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.response?.data?.message || 'Update failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.fullName);
      setPhoneNumber(profile.phoneNumber);
    }
    setIsEditing(false);
    setSaveMsg(null);
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading profile...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!profile) return <div className="p-8 text-red-400">Profile not found</div>;

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-gray-200">{value || '—'}</p>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>

      {saveMsg && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
          saveMsg.type === 'success'
            ? 'bg-green-900/30 border border-green-700 text-green-400'
            : 'bg-red-900/30 border border-red-700 text-red-400'
        }`}>
          {saveMsg.text}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-semibold text-white">{profile.fullName}</p>
              <p className="text-sm text-gray-400">{profile.email}</p>
              <span className="inline-block mt-1 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                {profile.role}
              </span>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Field label="User ID" value={profile.id} />
          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phoneNumber} />
          <Field label="Role" value={profile.role} />
          <Field label="Verified" value={profile.isVerified ? 'Yes ✓' : 'No ✗'} />
          <Field label="Status" value={profile.isActive ? 'Active' : 'Inactive'} />
          <Field label="Joined" value={new Date(profile.createdAt).toLocaleDateString()} />
        </div>
      </div>

      {isEditing && (
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Edit Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={logout}
        className="px-6 py-2 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors border border-red-900"
      >
        Logout
      </button>
    </div>
  );
}