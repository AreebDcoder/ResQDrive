import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../api';

interface HealthData {
  devMode: boolean;
  channels: Record<string, { configured: boolean; label: string }>;
  services: Record<string, { configured: boolean; label: string }>;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchHealth = async () => {
    try {
      const res = await api.get('/alert-dispatch/health');
      setHealth(res.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <div className="p-8 text-gray-400">Loading system health...</div>;
  if (!health) return <div className="p-8 text-red-400">Failed to load system health.</div>;

  const allChannels = { ...health.channels, ...health.services };
  const configuredCount = Object.values(allChannels).filter((v: any) => v.configured).length;
  const totalCount = Object.keys(allChannels).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated}</p>
        </div>
        <button onClick={fetchHealth} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {health.devMode && (
        <div className="mb-6 p-4 rounded-xl bg-amber-900/20 border border-amber-700/50 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-400" />
          <div>
            <p className="text-amber-400 font-semibold text-sm">DEV MODE ACTIVE</p>
            <p className="text-amber-400/70 text-xs">Some services are not configured. Emergency alerts may fall back to device-level channels.</p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-white">{configuredCount}<span className="text-gray-600 text-xl">/{totalCount}</span></div>
          <p className="text-sm text-gray-400">services configured</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(allChannels).map(([key, value]: [string, any]) => (
          <div key={key} className={`p-5 rounded-xl border ${value.configured ? 'bg-green-900/10 border-green-700/30' : 'bg-red-900/10 border-red-700/30'}`}>
            <div className="flex items-center gap-3 mb-2">
              {value.configured ? (
                <CheckCircle size={20} className="text-green-400" />
              ) : (
                <XCircle size={20} className="text-red-400" />
              )}
              <span className="text-sm font-semibold text-white">{value.label}</span>
            </div>
            <p className={`text-xs ${value.configured ? 'text-green-400' : 'text-red-400'}`}>
              {value.configured ? 'Configured' : 'Not configured (dev mode)'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}