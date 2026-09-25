import { useEffect, useState } from 'react';
import api from '../api';

export default function CrashDetectionLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    setIsLoading(true);
    api
      .get(`/admin/crash-detection-logs?limit=${limit}&skip=${(page - 1) * limit}`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setLogs(data);
        setTotal(res.data?.total ?? res.data?.meta?.total ?? data.length);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page]);

  if (isLoading && logs.length === 0) return <div className="p-8 text-gray-400">Loading crash detection logs...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Crash Sound Detection Logs</h1>
      {logs.length === 0 ? (
        <p className="text-gray-500">No crash detection events recorded.</p>
      ) : (
        <>
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <th className="p-3">User</th>
                  <th className="p-3">Top Class</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Flagged</th>
                  <th className="p-3">Sensor Fusion</th>
                  <th className="p-3">Trigger</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-700/30">
                    <td className="p-3 text-sm text-white">{log.user?.fullName || 'Unknown'}</td>
                    <td className="p-3 text-sm text-gray-300">{log.topMatchedClass || 'N/A'}</td>
                    <td className="p-3"><span className="text-xs font-bold text-amber-400">{((log.crashConfidence || 0) * 100).toFixed(1)}%</span></td>
                    <td className="p-3"><span className={`text-xs font-bold ${log.flaggedAsCrash ? 'text-red-400' : 'text-gray-500'}`}>{log.flaggedAsCrash ? 'YES' : 'NO'}</span></td>
                    <td className="p-3"><span className={`text-xs ${log.combinedWithSensorSignal ? 'text-green-400' : 'text-gray-500'}`}>{log.combinedWithSensorSignal ? '✓' : '—'}</span></td>
                    <td className="p-3 text-sm text-gray-400">{log.triggeredByTransient ? 'Transient' : 'Manual'}</td>
                    <td className="p-3 text-sm text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}