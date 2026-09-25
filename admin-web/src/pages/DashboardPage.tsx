import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, AreaChart, Area,
} from 'recharts';
import api from '../api';
import type { AnalyticsSummary, AnalyticsTrend, AnalyticsHotspot } from '../types';
import { Users, Car, BellRing, Cpu, Activity, AlertTriangle } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#6b7280', MINOR: '#fbbf24', MODERATE: '#fb923c', SEVERE: '#ef4444',
};

interface ExtendedSummary {
  users: { total: number; drivers: number; mechanics: number; vehicles: number };
  incidents: {
    total: number; active: number; resolved: number; falseAlarms: number;
    autoDetected: number; manuallyLogged: number; resolveRate: number;
  };
  notifications: { total: number; read: number; readRate: number };
  dispatch: {
    total: number; pushSent: number; smsSent: number; emailSent: number;
    pushSuccessRate: number; smsSuccessRate: number; emailSuccessRate: number;
  };
  ai: { repairReports: number; damageAssessments: number; crashLogs: number; voiceLogs: number };
  severityTrend7Days: Array<{ date: string; NONE: number; MINOR: number; MODERATE: number; SEVERE: number }>;
  recentActivity: {
    incidents: Array<{ id: string; severity: string; status: string; occurredAt: string; userName: string; address?: string | null }>;
    dispatchLogs: Array<{ id: string; user: string; pushStatus: string; smsStatus: string; emailStatus: string; createdAt: string }>;
  };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrend[]>([]);
  const [hotspots, setHotspots] = useState<AnalyticsHotspot[]>([]);
  const [ext, setExt] = useState<ExtendedSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [s, t, h, e] = await Promise.all([
          api.get('/admin/analytics/summary'),
          api.get('/admin/analytics/trends'),
          api.get('/admin/analytics/hotspots'),
          api.get('/admin/dashboard/extended-summary'),
        ]);
        setSummary(s.data);
        setTrends(t.data);
        setHotspots(h.data);
        setExt(e.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (isLoading) return <div className="p-8 text-gray-400">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  const pieData = summary
    ? [
        { name: 'NONE', value: summary.severityBreakdown.NONE, color: SEVERITY_COLORS.NONE },
        { name: 'MINOR', value: summary.severityBreakdown.MINOR, color: SEVERITY_COLORS.MINOR },
        { name: 'MODERATE', value: summary.severityBreakdown.MODERATE, color: SEVERITY_COLORS.MODERATE },
        { name: 'SEVERE', value: summary.severityBreakdown.SEVERE, color: SEVERITY_COLORS.SEVERE },
      ]
    : [];

  const trendData = trends.map((t) => ({ date: t.date.slice(5), count: t.count }));

  // 7-day stacked severity data (format MM-DD for x-axis)
  const sev7Data = (ext?.severityTrend7Days || []).map((d) => ({
    date: d.date.slice(5),
    NONE: d.NONE,
    MINOR: d.MINOR,
    MODERATE: d.MODERATE,
    SEVERE: d.SEVERE,
  }));

  // Incident type breakdown (AUTO vs MANUAL)
  const typePie = ext
    ? [
        { name: 'Auto-detected', value: ext.incidents.autoDetected, color: '#3b82f6' },
        { name: 'Manually logged', value: ext.incidents.manuallyLogged, color: '#a855f7' },
      ]
    : [];

  // Dispatch success rate data (for stacked bar)
  const dispatchData = ext
    ? [
        { name: 'Push', sent: ext.dispatch.pushSent, total: ext.dispatch.total, rate: ext.dispatch.pushSuccessRate },
        { name: 'SMS', sent: ext.dispatch.smsSent, total: ext.dispatch.total, rate: ext.dispatch.smsSuccessRate },
        { name: 'Email', sent: ext.dispatch.emailSent, total: ext.dispatch.total, rate: ext.dispatch.emailSuccessRate },
      ]
    : [];

  const kpiCards = [
    { label: 'Total Users', value: ext?.users.total ?? 0, sub: `${ext?.users.drivers ?? 0} drivers • ${ext?.users.mechanics ?? 0} mechanics`, icon: Users, color: 'border-blue-500', accent: 'text-blue-400' },
    { label: 'Total Vehicles', value: ext?.users.vehicles ?? 0, sub: 'Registered in system', icon: Car, color: 'border-purple-500', accent: 'text-purple-400' },
    { label: 'Total Incidents', value: ext?.incidents.total ?? 0, sub: `${ext?.incidents.active ?? 0} active • ${ext?.incidents.resolved ?? 0} resolved`, icon: AlertTriangle, color: 'border-red-500', accent: 'text-red-400' },
    { label: 'Resolve Rate', value: `${ext?.incidents.resolveRate ?? 0}%`, sub: 'Resolved / total', icon: Activity, color: 'border-green-500', accent: 'text-green-400' },
    { label: 'Notifications Sent', value: ext?.notifications.total ?? 0, sub: `${ext?.notifications.readRate ?? 0}% read rate`, icon: BellRing, color: 'border-amber-500', accent: 'text-amber-400' },
    { label: 'AI Damage Reports', value: ext?.ai.damageAssessments ?? 0, sub: `${ext?.ai.repairReports ?? 0} cost estimates`, icon: Cpu, color: 'border-cyan-500', accent: 'text-cyan-400' },
    { label: 'Crash Detection Logs', value: ext?.ai.crashLogs ?? 0, sub: 'YAMNet audio events', icon: Cpu, color: 'border-indigo-500', accent: 'text-indigo-400' },
    { label: 'Voice Commands', value: ext?.ai.voiceLogs ?? 0, sub: 'Logged transcripts', icon: BellRing, color: 'border-pink-500', accent: 'text-pink-400' },
  ];

  return (
    <div className="p-8 overflow-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* KPI grid — 8 cards in a 4-col layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-gray-800 rounded-xl p-5 border-l-4 ${card.color} flex items-start justify-between`}>
              <div>
                <p className={`text-3xl font-bold ${card.accent}`}>{card.value}</p>
                <p className="text-sm text-gray-400 mt-1">{card.label}</p>
                <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
              </div>
              <Icon size={22} className="text-gray-600 mt-1" />
            </div>
          );
        })}
      </div>

      {/* Charts row — pie + 30-day line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Severity Distribution</h2>
          {summary?.totalIncidents === 0 ? (
            <p className="text-gray-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">30-Day Incident Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 7-day stacked severity trend */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Severity Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={sev7Data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="NONE" stackId="1" stroke={SEVERITY_COLORS.NONE} fill={SEVERITY_COLORS.NONE} />
              <Area type="monotone" dataKey="MINOR" stackId="1" stroke={SEVERITY_COLORS.MINOR} fill={SEVERITY_COLORS.MINOR} />
              <Area type="monotone" dataKey="MODERATE" stackId="1" stroke={SEVERITY_COLORS.MODERATE} fill={SEVERITY_COLORS.MODERATE} />
              <Area type="monotone" dataKey="SEVERE" stackId="1" stroke={SEVERITY_COLORS.SEVERE} fill={SEVERITY_COLORS.SEVERE} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Incident type pie (AUTO vs MANUAL) */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Detection Type</h2>
          {ext && ext.incidents.total === 0 ? (
            <p className="text-gray-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {typePie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Dispatch success rates */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Notification Channel Success Rates</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dispatchData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" unit="%" />
            <YAxis dataKey="name" type="category" stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} formatter={(v: any) => [`${v}%`, 'Success rate']} />
            <Bar dataKey="rate" radius={[0, 8, 8, 0]}>
              {dispatchData.map((_, i) => (
                <Cell key={i} fill={['#3b82f6', '#10b981', '#a855f7'][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent activity feed — two columns: incidents + dispatch logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" /> Recent Incidents
          </h2>
          <div className="space-y-2">
            {(ext?.recentActivity.incidents || []).map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white mr-2 ${SEVERITY_COLORS[i.severity] ? '' : 'bg-gray-600'}`}
                    style={{ backgroundColor: SEVERITY_COLORS[i.severity] }}>
                    {i.severity}
                  </span>
                  <span className="text-sm text-white">{i.userName}</span>
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-md">{i.address || 'No address'}</p>
                </div>
                <span className="text-xs text-gray-500">{new Date(i.occurredAt).toLocaleDateString()}</span>
              </div>
            ))}
            {(ext?.recentActivity.incidents || []).length === 0 && (
              <p className="text-gray-500 text-center py-4">No recent incidents</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-400" /> Recent Dispatch Logs
          </h2>
          <div className="space-y-2">
            {(ext?.recentActivity.dispatchLogs || []).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <span className="text-sm text-white">{d.user}</span>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[10px] font-bold ${d.pushStatus === 'SENT' ? 'text-green-400' : 'text-red-400'}`}>PUSH:{d.pushStatus}</span>
                    <span className={`text-[10px] font-bold ${d.smsStatus === 'SENT' ? 'text-green-400' : 'text-red-400'}`}>SMS:{d.smsStatus}</span>
                    <span className={`text-[10px] font-bold ${d.emailStatus === 'SENT' ? 'text-green-400' : 'text-red-400'}`}>EMAIL:{d.emailStatus}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {(ext?.recentActivity.dispatchLogs || []).length === 0 && (
              <p className="text-gray-500 text-center py-4">No dispatch activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Hotspots */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Top Hotspots</h2>
        {hotspots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No geotagged incidents</p>
        ) : (
          <div className="space-y-3">
            {hotspots.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                <div>
                  <span className="text-red-500 font-bold mr-3">#{i + 1}</span>
                  <span className="text-white font-medium">{h.incidentCount} incidents</span>
                  <p className="text-gray-500 text-sm mt-1">
                    {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                    {h.sampleAddresses.length > 0 && ` — ${h.sampleAddresses.join(', ')}`}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  Open Maps →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
