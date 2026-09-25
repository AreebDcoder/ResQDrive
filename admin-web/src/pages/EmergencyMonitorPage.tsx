import { useEffect, useState } from 'react';
import { Activity, MapPin, Send, RefreshCw } from 'lucide-react';
import api from '../api';

export default function EmergencyMonitorPage() {
  const [emergencySessions, setEmergencySessions] = useState<any[]>([]);
  const [locationSessions, setLocationSessions] = useState<any[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchAll = async () => {
    try {
      const [e, l, d] = await Promise.all([
        api.get('/admin/emergency-sessions'),
        api.get('/admin/location-sessions'),
        api.get('/admin/dispatch-logs?limit=10'),
      ]);
      setEmergencySessions(e.data || []);
      setLocationSessions(l.data || []);
      setDispatchLogs(d.data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch monitor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <div className="p-8 text-gray-400">Loading emergency monitor...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Emergency Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">Live monitoring • Last updated: {lastUpdated}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">LIVE</span>
        </div>
      </div>

      {/* Active Emergency Sessions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity size={16} /> Active Emergency Sessions ({emergencySessions.length})
        </h2>
        {emergencySessions.length === 0 ? (
          <p className="text-gray-600 text-sm p-4">No active emergency sessions.</p>
        ) : (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <th className="p-3">User</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Started</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {emergencySessions.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-800">
                    <td className="p-3 text-sm text-white">{s.user?.fullName || 'Unknown'}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded text-xs font-bold bg-red-600 text-white">{s.incident?.severity || 'N/A'}</span></td>
                    <td className="p-3 text-sm text-gray-300">P{s.currentPriority || 1}</td>
                    <td className="p-3 text-sm text-gray-400">{new Date(s.triggeredAt).toLocaleString()}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Location Sessions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin size={16} /> Active Location Sessions ({locationSessions.length})
        </h2>
        {locationSessions.length === 0 ? (
          <p className="text-gray-600 text-sm p-4">No active location sessions.</p>
        ) : (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <th className="p-3">User</th>
                  <th className="p-3">Last Coordinates</th>
                  <th className="p-3">Last Update</th>
                  <th className="p-3">Track Link</th>
                </tr>
              </thead>
              <tbody>
                {locationSessions.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-800">
                    <td className="p-3 text-sm text-white">{s.user?.fullName || 'Unknown'}</td>
                    <td className="p-3 text-sm text-gray-300">{s.lastLat ? `${s.lastLat.toFixed(4)}, ${s.lastLng?.toFixed(4)}` : 'No GPS yet'}</td>
                    <td className="p-3 text-sm text-gray-400">{s.lastUpdateAt ? new Date(s.lastUpdateAt).toLocaleTimeString() : '—'}</td>
                    <td className="p-3"><a href={`${api.defaults?.baseURL || 'http://localhost:3000'}/track.html?session=${s.shareToken}`} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 text-xs">Open Map →</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Dispatch Logs */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Send size={16} /> Recent Dispatch Logs ({dispatchLogs.length})
        </h2>
        {dispatchLogs.length === 0 ? (
          <p className="text-gray-600 text-sm p-4">No dispatch logs.</p>
        ) : (
          <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <th className="p-3">User</th>
                  <th className="p-3">Push</th>
                  <th className="p-3">WhatsApp</th>
                  <th className="p-3">Server SMS</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {dispatchLogs.map((log: any) => {
                  const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
                  const whatsappSent = payload?.contacts?.length > 0;
                  const deviceSmsUsed = payload?.deviceSmsUsed || payload?.dispatchMode === 'failed';
                  return (
                    <tr key={log.id} className="border-b border-gray-800">
                      <td className="p-3 text-sm text-white">{log.user?.fullName || 'Unknown'}</td>
                      <td className="p-3"><span className={`text-xs font-bold ${log.pushStatus === 'SENT' ? 'text-green-400' : 'text-red-400'}`}>{log.pushStatus}</span></td>
                      <td className="p-3"><span className={`text-xs font-bold ${whatsappSent ? 'text-green-400' : 'text-gray-500'}`}>{whatsappSent ? 'SENT' : 'N/A'}</span></td>
                      <td className="p-3"><span className={`text-xs font-bold ${log.smsStatus === 'SENT' ? 'text-green-400' : 'text-red-400'}`}>{log.smsStatus}</span>{deviceSmsUsed && <span className="block text-[10px] text-amber-400">+ device SIM</span>}</td>
                      <td className="p-3"><span className={`text-xs font-bold ${log.emailStatus === 'SENT' ? 'text-green-400' : 'text-red-400'}`}>{log.emailStatus}</span></td>
                      <td className="p-3 text-sm text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}