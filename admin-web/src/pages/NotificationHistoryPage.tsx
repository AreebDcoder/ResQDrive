import { useEffect, useState } from 'react';
import api from '../api';

export default function NotificationHistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/admin/notification-history?limit=${limit}&skip=${(page - 1) * limit}`);
        setLogs(res.data?.data || []);
        setTotal(res.data?.total || 0);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetch();
  }, [page]);

  if (isLoading) return <div className="p-8 text-gray-400">Loading notifications...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Notification History ({total})</h1>
      {logs.length === 0 ? (
        <p className="text-gray-500">No notifications sent.</p>
      ) : (
        <>
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <th className="p-3">User</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Body</th>
                  <th className="p-3">Read</th>
                  <th className="p-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-700/30">
                    <td className="p-3 text-sm text-white">{log.user?.fullName || 'Unknown'}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded text-xs font-bold bg-purple-900/40 text-purple-400">{log.category || 'general'}</span></td>
                    <td className="p-3 text-sm text-gray-300">{log.title || '—'}</td>
                    <td className="p-3 text-sm text-gray-400 max-w-xs truncate">{log.body || '—'}</td>
                    <td className="p-3"><span className={`text-xs font-bold ${log.isRead ? 'text-green-400' : 'text-amber-400'}`}>{log.isRead ? 'READ' : 'UNREAD'}</span></td>
                    <td className="p-3 text-sm text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-30">Previous</button>
              <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / limit)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-30">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}