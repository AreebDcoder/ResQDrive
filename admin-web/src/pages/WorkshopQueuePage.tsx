import { useEffect, useState } from 'react';
import api from '../api';

export default function WorkshopQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = () => {
    api.get('/admin/workshop-queue').then(res => setQueue(res.data || [])).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const approve = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/verify-workshop`, { isWorkshopVerified: true });
      setQueue(prev => prev.filter(u => u.id !== userId));
    } catch (err) { alert('Failed to approve.'); }
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading workshop queue...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Workshop Verification Queue ({queue.length})</h1>
      {queue.length === 0 ? (
        <p className="text-gray-500">All workshops are verified. No pending approvals.</p>
      ) : (
        <div className="space-y-4">
          {queue.map((u: any) => (
            <div key={u.id} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{u.fullName}</p>
                <p className="text-xs text-gray-400">{u.email} • {u.phoneNumber}</p>
                {u.mechanicDetails && (
                  <p className="text-xs text-gray-500 mt-1">{u.mechanicDetails.workshopName} — {u.mechanicDetails.specialization}</p>
                )}
              </div>
              <button onClick={() => approve(u.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Approve</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}