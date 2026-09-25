import { useEffect, useState } from 'react';
import api from '../api';

export default function VoiceCommandLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/voice-command-logs').then(res => setLogs(res.data || [])).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-8 text-gray-400">Loading voice command logs...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Voice Command Logs</h1>
      {logs.length === 0 ? (
        <p className="text-gray-500">No voice commands recorded.</p>
      ) : (
        <div className="bg-gray-800/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                <th className="p-3">User</th>
                <th className="p-3">Intent</th>
                <th className="p-3">Transcript</th>
                <th className="p-3">Engine</th>
                <th className="p-3">Action Taken</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-700/30">
                  <td className="p-3 text-sm text-white">{log.user?.fullName || 'Unknown'}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded text-xs font-bold bg-blue-900/40 text-blue-400">{log.classifiedIntent || 'N/A'}</span></td>
                  <td className="p-3 text-sm text-gray-300 italic">"{log.rawTranscript || '—'}"</td>
                  <td className="p-3 text-sm text-gray-400">{log.recognitionEngine || 'N/A'}</td>
                  <td className="p-3"><span className={`text-xs font-bold ${log.actionTaken ? 'text-green-400' : 'text-gray-500'}`}>{log.actionTaken ? 'YES' : 'NO'}</span></td>
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