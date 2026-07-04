import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../api';
import type { AnalyticsSummary, AnalyticsTrend, AnalyticsHotspot } from '../types';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#6b7280', MINOR: '#fbbf24', MODERATE: '#fb923c', SEVERE: '#ef4444',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrend[]>([]);
  const [hotspots, setHotspots] = useState<AnalyticsHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [s, t, h] = await Promise.all([
          api.get('/admin/analytics/summary'),
          api.get('/admin/analytics/trends'),
          api.get('/admin/analytics/hotspots'),
        ]);
        setSummary(s.data);
        setTrends(t.data);
        setHotspots(h.data);
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

  return (
    <div className="p-8 overflow-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: summary?.totalIncidents ?? 0, color: 'border-red-500' },
          { label: 'Active', value: summary?.activeIncidents ?? 0, color: 'border-orange-500' },
          { label: 'Resolved', value: summary?.resolvedIncidents ?? 0, color: 'border-green-500' },
          { label: 'False Alarms', value: summary?.falseAlarms ?? 0, color: 'border-gray-500' },
        ].map((card) => (
          <div key={card.label} className={`bg-gray-800 rounded-xl p-6 border-l-4 ${card.color}`}>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Severity Distribution</h2>
          {summary?.totalIncidents === 0 ? (
            <p className="text-gray-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
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
          <h2 className="text-lg font-semibold text-white mb-4">30-Day Trend</h2>
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
      </div>

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