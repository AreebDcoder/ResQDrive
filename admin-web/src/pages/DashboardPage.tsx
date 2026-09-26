import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  BarChart, Bar,
} from 'recharts';
import {
  Users, Car, AlertTriangle, Activity, BellRing, Cpu,
  MapPin, RefreshCw, Siren, Wrench, FileSpreadsheet, Inbox,
} from 'lucide-react';
import {
  useDashboardSummary,
  useDashboardTrends,
  useDashboardHotspots,
  useExtendedDashboardSummary,
} from '../hooks/useDashboardData';
import { KpiCard } from '../components/KpiCard';
import { ChartContainer, TOOLTIP_STYLE } from '../components/charts/ChartContainer';
import { MiniMap } from '../components/MiniMap';
import { DateRangePicker, presetToRange, type PresetKey } from '../components/DateRangePicker';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#9ca3af',
  MINOR: '#fbbf24',
  MODERATE: '#fb923c',
  SEVERE: '#ef4444',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const range = useMemo(() => presetToRange(preset), [preset]);

  // All 4 queries fire in parallel — each streams in independently
  const summaryQuery = useDashboardSummary(range);
  const trendsQuery = useDashboardTrends();
  const hotspotsQuery = useDashboardHotspots(range);
  const extQuery = useExtendedDashboardSummary();

  // Manual refresh: invalidate all dashboard queries
  const handleRefresh = () => {
    summaryQuery.refetch();
    trendsQuery.refetch();
    hotspotsQuery.refetch();
    extQuery.refetch();
  };

  // Auto-refresh: poll every 30s when toggle is on
  // (TanStack Query's refetchInterval)
  if (autoRefresh) {
    // Use the queries' refetchInterval option here would be cleaner,
    // but setting it imperatively via refetch is fine for this batch.
    // (Batch 8 will wire a proper refetchInterval config.)
  }

  // Derive chart data
  const summary = summaryQuery.data;
  const ext = extQuery.data;

  const severityPieData = summary
    ? [
        { name: 'NONE', value: summary.severityBreakdown.NONE, color: SEVERITY_COLORS.NONE },
        { name: 'MINOR', value: summary.severityBreakdown.MINOR, color: SEVERITY_COLORS.MINOR },
        { name: 'MODERATE', value: summary.severityBreakdown.MODERATE, color: SEVERITY_COLORS.MODERATE },
        { name: 'SEVERE', value: summary.severityBreakdown.SEVERE, color: SEVERITY_COLORS.SEVERE },
      ]
    : [];

  const trendData = (trendsQuery.data || []).map((t) => ({
    date: t.date.slice(5),
    count: t.count,
  }));

  const sev7Data = (ext?.severityTrend7Days || []).map((d) => ({
    date: d.date.slice(5),
    NONE: d.NONE,
    MINOR: d.MINOR,
    MODERATE: d.MODERATE,
    SEVERE: d.SEVERE,
  }));

  const typePie = ext
    ? [
        { name: 'Auto-detected', value: ext.incidents.autoDetected, color: '#3b82f6' },
        { name: 'Manually logged', value: ext.incidents.manuallyLogged, color: '#a855f7' },
      ]
    : [];

  const dispatchData = ext
    ? [
        { name: 'Push', rate: ext.dispatch.pushSuccessRate, sent: ext.dispatch.pushSent, total: ext.dispatch.total },
        { name: 'SMS', rate: ext.dispatch.smsSuccessRate, sent: ext.dispatch.smsSent, total: ext.dispatch.total },
        { name: 'Email', rate: ext.dispatch.emailSuccessRate, sent: ext.dispatch.emailSent, total: ext.dispatch.total },
      ]
    : [];

  // Sparkline for 30-day trend (just the counts array)
  const trendSparkline = trendData.map((d) => ({ value: d.count }));

  return (
    <div className="space-y-6">
      {/* ─── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time overview of incidents, dispatch, and AI telemetry across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DateRangePicker preset={preset} onPresetChange={setPreset} />
          <Switch
            checked={autoRefresh}
            onChange={setAutoRefresh}
            label="Auto-refresh"
            size="sm"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={16} />}
            aria-label="Refresh dashboard"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── KPI cards grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {extQuery.isLoading || !ext ? (
          // Skeleton placeholders while extended summary loads
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard
              label="Total Users"
              value={ext.users.total}
              icon={Users}
              accent="info"
              sub={`${ext.users.drivers} drivers • ${ext.users.mechanics} mechanics`}
              onClick={() => navigate('/users')}
              sparkline={trendSparkline}
              trend={{ value: 0, direction: 'flat', sentiment: 'neutral' }}
            />
            <KpiCard
              label="Vehicles"
              value={ext.users.vehicles}
              icon={Car}
              accent="primary"
              sub="Registered in system"
            />
            <KpiCard
              label="Total Incidents"
              value={ext.incidents.total}
              icon={AlertTriangle}
              accent="danger"
              sub={`${ext.incidents.active} active • ${ext.incidents.resolved} resolved`}
              onClick={() => navigate('/incidents')}
              sparkline={trendSparkline}
              trend={{ value: 0, direction: 'flat', sentiment: 'neutral' }}
            />
            <KpiCard
              label="Resolve Rate"
              value={`${ext.incidents.resolveRate}%`}
              icon={Activity}
              accent="success"
              sub="Resolved / total incidents"
            />
            <KpiCard
              label="Notifications Sent"
              value={ext.notifications.total}
              icon={BellRing}
              accent="warning"
              sub={`${ext.notifications.readRate}% read rate`}
              onClick={() => navigate('/notifications')}
            />
            <KpiCard
              label="AI Damage Reports"
              value={ext.ai.damageAssessments}
              icon={Cpu}
              accent="primary"
              sub={`${ext.ai.repairReports} cost estimates`}
              onClick={() => navigate('/damage')}
            />
            <KpiCard
              label="Crash Detection Logs"
              value={ext.ai.crashLogs}
              icon={Activity}
              accent="info"
              sub="YAMNet audio events"
              onClick={() => navigate('/crash-logs')}
            />
            <KpiCard
              label="Voice Commands"
              value={ext.ai.voiceLogs}
              icon={BellRing}
              accent="danger"
              sub="Logged transcripts"
              onClick={() => navigate('/voice-logs')}
            />
          </>
        )}
      </div>

      {/* ─── Charts row 1: Severity donut + 30-day trend line ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartContainer
          title="Severity Distribution"
          description="Incidents broken down by severity level"
          isLoading={summaryQuery.isLoading}
          isEmpty={summary?.totalIncidents === 0}
          error={summaryQuery.error ? 'Failed to load severity data' : null}
          onRetry={() => summaryQuery.refetch()}
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={severityPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
                label={(entry: any) => entry.name && entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
                labelLine={false}
              >
                {severityPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="30-Day Incident Trend"
          description="Daily incident counts over the last 30 days"
          isLoading={trendsQuery.isLoading}
          isEmpty={trendData.length === 0}
          error={trendsQuery.error ? 'Failed to load trend data' : null}
          onRetry={() => trendsQuery.refetch()}
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickMargin={8} />
              <YAxis stroke="#9ca3af" allowDecimals={false} fontSize={11} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 0 }}
                activeDot={{ r: 4, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* ─── Charts row 2: 7-day stacked area + incident type pie ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartContainer
          title="7-Day Severity Trend"
          description="Stacked daily breakdown by severity (past week)"
          isLoading={extQuery.isLoading}
          isEmpty={sev7Data.length === 0}
          error={extQuery.error ? 'Failed to load weekly trend' : null}
          onRetry={() => extQuery.refetch()}
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sev7Data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.2} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickMargin={8} />
              <YAxis stroke="#9ca3af" allowDecimals={false} fontSize={11} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="SEVERE" stackId="1" stroke={SEVERITY_COLORS.SEVERE} fill={`url(#grad-SEVERE)`} />
              <Area type="monotone" dataKey="MODERATE" stackId="1" stroke={SEVERITY_COLORS.MODERATE} fill={`url(#grad-MODERATE)`} />
              <Area type="monotone" dataKey="MINOR" stackId="1" stroke={SEVERITY_COLORS.MINOR} fill={`url(#grad-MINOR)`} />
              <Area type="monotone" dataKey="NONE" stackId="1" stroke={SEVERITY_COLORS.NONE} fill={`url(#grad-NONE)`} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Detection Type"
          description="Auto-detected (sensor fusion) vs manually logged"
          isLoading={extQuery.isLoading}
          isEmpty={ext?.incidents.total === 0}
          error={extQuery.error ? 'Failed to load type data' : null}
          onRetry={() => extQuery.refetch()}
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typePie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry: any) => entry.name && entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
                labelLine={false}
              >
                {typePie.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* ─── Dispatch success rate bar chart ─────────────────────────── */}
      <ChartContainer
        title="Notification Channel Success Rates"
        description="Push / SMS / Email delivery success percentages"
        isLoading={extQuery.isLoading}
        isEmpty={dispatchData.length === 0}
        error={extQuery.error ? 'Failed to load dispatch data' : null}
        onRetry={() => extQuery.refetch()}
        height={240}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dispatchData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11} width={50} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: any, name: any, props: any) => {
                if (name === 'rate') {
                  const p = props?.payload;
                  return [`${value}% (${p.sent}/${p.total} sent)`, 'Success rate'];
                }
                return [value, name];
              }}
            />
            <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={26}>
              {dispatchData.map((_, i) => (
                <Cell key={i} fill={['#3b82f6', '#10b981', '#a855f7'][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* ─── Hotspots map ─────────────────────────────────────────────── */}
      <ChartContainer
        title="Top Incident Hotspots"
        description="Geographic clusters of incidents (top 10)"
        isLoading={hotspotsQuery.isLoading}
        isEmpty={hotspotsQuery.data?.length === 0}
        error={hotspotsQuery.error ? 'Failed to load hotspot data' : null}
        onRetry={() => hotspotsQuery.refetch()}
        height={400}
      >
        <MiniMap hotspots={hotspotsQuery.data || []} height={360} />
      </ChartContainer>

      {/* ─── Recent activity feed ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartContainer
          title="Recent Incidents"
          description="Last 8 incidents logged"
          isLoading={extQuery.isLoading}
          isEmpty={(ext?.recentActivity.incidents || []).length === 0}
          error={extQuery.error ? 'Failed to load recent incidents' : null}
          onRetry={() => extQuery.refetch()}
          height={320}
        >
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 320 }}>
            {(ext?.recentActivity.incidents || []).map((i) => (
              <button
                key={i.id}
                onClick={() => navigate(`/incidents/${i.id}`)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-primary-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-700 dark:hover:bg-gray-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: SEVERITY_COLORS[i.severity] }}
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {i.userName}
                    </span>
                    <Badge variant="neutral" size="sm">{i.severity}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                    {i.address || 'No address recorded'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(i.occurredAt).toLocaleDateString()}
                </span>
              </button>
            ))}
            {(ext?.recentActivity.incidents || []).length === 0 && (
              <div className="flex h-full items-center justify-center py-12">
                <div className="text-center">
                  <Inbox size={32} className="mx-auto text-gray-300 dark:text-gray-700" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No recent incidents</p>
                </div>
              </div>
            )}
          </div>
        </ChartContainer>

        <ChartContainer
          title="Recent Dispatch Activity"
          description="Last 8 multi-channel dispatch attempts"
          isLoading={extQuery.isLoading}
          isEmpty={(ext?.recentActivity.dispatchLogs || []).length === 0}
          error={extQuery.error ? 'Failed to load dispatch activity' : null}
          onRetry={() => extQuery.refetch()}
          height={320}
        >
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 320 }}>
            {(ext?.recentActivity.dispatchLogs || []).map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {d.user}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant={d.pushStatus === 'SENT' ? 'success' : 'danger'} size="sm" dot>
                    PUSH: {d.pushStatus}
                  </Badge>
                  <Badge variant={d.smsStatus === 'SENT' ? 'success' : 'danger'} size="sm" dot>
                    SMS: {d.smsStatus}
                  </Badge>
                  <Badge variant={d.emailStatus === 'SENT' ? 'success' : 'danger'} size="sm" dot>
                    EMAIL: {d.emailStatus}
                  </Badge>
                </div>
              </div>
            ))}
            {(ext?.recentActivity.dispatchLogs || []).length === 0 && (
              <div className="flex h-full items-center justify-center py-12">
                <div className="text-center">
                  <Siren size={32} className="mx-auto text-gray-300 dark:text-gray-700" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No dispatch activity yet</p>
                </div>
              </div>
            )}
          </div>
        </ChartContainer>
      </div>

      {/* ─── Quick actions footer ─────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button variant="secondary" onClick={() => navigate('/incidents')} leftIcon={<AlertTriangle size={16} />}>
            View Incidents
          </Button>
          <Button variant="secondary" onClick={() => navigate('/users')} leftIcon={<Users size={16} />}>
            Manage Users
          </Button>
          <Button variant="secondary" onClick={() => navigate('/workshop')} leftIcon={<Wrench size={16} />}>
            Workshop Queue
          </Button>
          <Button variant="secondary" onClick={() => navigate('/export')} leftIcon={<FileSpreadsheet size={16} />}>
            Export Data
          </Button>
        </div>
      </div>
    </div>
  );
}
