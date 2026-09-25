import { useEffect, useState } from 'react';
import api from '../api';

export default function CrashDetectionLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/crash-detection-logs').then(res => setLogs(res.data || [])).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-8 text-gray-400">Loading crash detection logs...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Crash Sound Detection Logs</h1>
      {logs.length === 0 ? (
        <p className="text-gray-500">No crash detection events recorded.</p>
      ) : (
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
      )}
    </div>
  );
}