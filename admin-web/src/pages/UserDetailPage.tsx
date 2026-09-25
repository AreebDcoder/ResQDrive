import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../api';

export default function UserDetailPage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/users/${userId}/detail`).then(res => setUser(res.data)).catch(console.error).finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) return <div className="p-8 text-gray-400">Loading user detail...</div>;
  if (!user) return <div className="p-8 text-red-400">User not found.</div>;

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft size={20} /> Back to Users
      </button>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-lg font-bold">
            {user.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
          <span className="ml-auto px-3 py-1 rounded text-xs font-bold bg-blue-900/40 text-blue-400">{user.role}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Phone:</span> <span className="text-white">{user.phoneNumber}</span></div>
          <div><span className="text-gray-500">Verified:</span> <span className={user.isVerified ? 'text-green-400' : 'text-red-400'}>{user.isVerified ? 'YES' : 'NO'}</span></div>
          <div><span className="text-gray-500">Active:</span> <span className={user.isActive ? 'text-green-400' : 'text-red-400'}>{user.isActive ? 'YES' : 'NO'}</span></div>
          <div><span className="text-gray-500">Joined:</span> <span className="text-white">{new Date(user.createdAt).toLocaleDateString()}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Incidents ({user.incidents?.length || 0})</h3>
          <div className="space-y-2">
            {user.incidents?.map((inc: any) => (
              <div key={inc.id} className="p-3 bg-gray-800/50 rounded-lg text-xs">
                <span className="font-bold text-red-400">{inc.severity}</span>
                <span className="ml-2 text-gray-400">{inc.status}</span>
                <p className="text-gray-500 mt-1">{new Date(inc.occurredAt).toLocaleString()}</p>
              </div>
            )) || <p className="text-gray-600 text-sm">No incidents.</p>}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Vehicles ({user.vehicles?.length || 0})</h3>
          <div className="space-y-2">
            {user.vehicles?.map((v: any) => (
              <div key={v.id} className="p-3 bg-gray-800/50 rounded-lg text-xs">
                <span className="text-white">{v.make} {v.model} ({v.year})</span>
                {v.isPrimary && <span className="ml-2 text-green-400">★ Primary</span>}
                <p className="text-gray-500 mt-1">{v.licensePlate}</p>
              </div>
            )) || <p className="text-gray-600 text-sm">No vehicles.</p>}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Emergency Contacts ({user.contacts?.length || 0})</h3>
          <div className="space-y-2">
            {user.contacts?.map((c: any) => (
              <div key={c.id} className="p-3 bg-gray-800/50 rounded-lg text-xs">
                <span className="text-white">P{c.priorityOrder}: {c.name}</span>
                <p className="text-gray-500 mt-1">{c.phoneNumber} • {c.relationship}</p>
              </div>
            )) || <p className="text-gray-600 text-sm">No contacts.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}