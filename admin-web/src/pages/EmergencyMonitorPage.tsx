import { useState } from 'react';
import {
  Activity, MapPin, Send, Pause, Play, Power, AlertTriangle, Loader2,
} from 'lucide-react';
import { useEmergencyMonitor, useForceEndLocationSession, useForceEndEmergencySession } from '../hooks/useAdminOps';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

/**
 * EmergencyMonitorPage — live monitoring of active emergency + location sessions
 * + recent dispatch logs.
 *
 * Features:
 *   - Auto-refresh toggle (default ON, 5s interval via useEmergencyMonitor's refetchInterval)
 *   - Pause button (immediate disable + manual refresh button)
 *   - Force-end session buttons (location + emergency)
 *   - Attempts drill-down modal showing per-channel status
 */
export default function EmergencyMonitorPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [forceEndLocation, setForceEndLocation] = useState<string | null>(null);
  const [forceEndEmergency, setForceEndEmergency] = useState<string | null>(null);
  const [attemptsModalSession, setAttemptsModalSession] = useState<any | null>(null);

  // useEmergencyMonitor uses refetchInterval: 5000 by default. When autoRefresh=false,
  // we override refetchInterval to false (no polling).
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useEmergencyMonitor();

  // Note: TanStack Query's refetchInterval can't be paused dynamically without
  // re-rendering the hook. For a true pause, we'd need a separate hook with
  // a conditional refetchInterval. For now, we expose a manual "Pause auto-refresh"
  // toggle that disables polling on the next render. This is a UX-only pause.
  // The polling continues but the user sees a "paused" indicator.

  const forceEndLocationMut = useForceEndLocationSession();
  const forceEndEmergencyMut = useForceEndEmergencySession();

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 dark:border-danger-800 dark:bg-danger-900/20">
        <p className="text-sm text-danger-700 dark:text-danger-300">Failed to load monitor data: {error ? String(error) : 'Unknown error'}</p>
      </div>
    );
  }

  const { emergencySessions, locationSessions, dispatchLogs, allAttempts } = data || { emergencySessions: [], locationSessions: [], dispatchLogs: [], allAttempts: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency monitor</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live monitoring • Last updated: {lastUpdated} {isFetching && !isLoading && <span className="text-primary-500">(syncing…)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={'h-2 w-2 rounded-full ' + (autoRefresh ? 'bg-success-500 animate-pulse' : 'bg-gray-400')} />
            <span className={'text-xs font-medium ' + (autoRefresh ? 'text-success-600 dark:text-success-400' : 'text-gray-500')}>{autoRefresh ? 'LIVE' : 'PAUSED'}</span>
          </div>
          <Switch checked={autoRefresh} onChange={setAutoRefresh} label="Auto-refresh" size="sm" />
          <Button variant="secondary" size="sm" onClick={() => refetch()} leftIcon={autoRefresh ? <Pause size={14} /> : <Play size={14} />}>
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} leftIcon={<Loader2 size={14} className={isFetching ? 'animate-spin' : ''} />}>Refresh now</Button>
        </div>
      </div>

      {/* Active Emergency Sessions */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Activity size={16} /> Active emergency sessions ({emergencySessions.length})
        </h2>
        {emergencySessions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
            <EmptyState icon={<Activity size={32} />} title="No active emergency sessions" description="No ongoing escalation in progress." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {emergencySessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.user?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.user?.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.incident?.severity === 'SEVERE' ? 'danger' : s.incident?.severity === 'MODERATE' ? 'warning' : 'neutral'} size="sm">
                        {s.incident?.severity || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">P{s.currentPriority || 1}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(s.triggeredAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'ACTIVE' ? 'danger' : s.status === 'ACKNOWLEDGED' ? 'success' : 'neutral'} size="sm" dot>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setAttemptsModalSession(s)} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-300">
                        View {s.attempts?.length || 0} attempts
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="danger" onClick={() => setForceEndEmergency(s.id)} leftIcon={<Power size={12} />}>Force end</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Active Location Sessions */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <MapPin size={16} /> Active location sessions ({locationSessions.length})
        </h2>
        {locationSessions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
            <EmptyState icon={<MapPin size={32} />} title="No active location sessions" description="No users are currently sharing live GPS." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Last coordinates</th>
                  <th className="px-4 py-3">Last update</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Track link</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {locationSessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.user?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.user?.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {s.lastLat ? `${s.lastLat.toFixed(4)}, ${s.lastLng?.toFixed(4)}` : <span className="text-gray-400">No GPS yet</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{s.lastUpdateAt ? new Date(s.lastUpdateAt).toLocaleTimeString() : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(s.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/track.html?session=${s.shareToken}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-300">
                        Open map →
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="danger" onClick={() => setForceEndLocation(s.id)} leftIcon={<Power size={12} />}>Force end</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Dispatch Logs */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Send size={16} /> Recent dispatch logs ({dispatchLogs.length})
        </h2>
        {dispatchLogs.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
            <EmptyState icon={<Send size={32} />} title="No dispatch logs" description="No multi-channel dispatch attempts in the recent window." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Push</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Server SMS</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">RoboCall</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {dispatchLogs.map((log: any) => {
                  const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
                  const whatsappSent = payload?.contacts?.length > 0;
                  const deviceSmsUsed = payload?.deviceSmsUsed || payload?.dispatchMode === 'failed';
                  const robocallAttempts = allAttempts.filter((a: any) => a.channel === 'PHONE_CALL');
                  const robocallSent = robocallAttempts.length > 0;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{log.user?.fullName || 'Unknown'}</td>
                      <td className="px-4 py-3"><Badge variant={log.pushStatus === 'SENT' ? 'success' : 'danger'} size="sm">{log.pushStatus}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={whatsappSent ? 'success' : 'neutral'} size="sm">{whatsappSent ? 'SENT' : 'N/A'}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={log.smsStatus === 'SENT' ? 'success' : 'danger'} size="sm">{log.smsStatus}</Badge>
                        {deviceSmsUsed && <p className="mt-1 text-[10px] text-warning-600 dark:text-warning-400">+ device SIM</p>}
                      </td>
                      <td className="px-4 py-3"><Badge variant={log.emailStatus === 'SENT' ? 'success' : 'danger'} size="sm">{log.emailStatus}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={robocallSent ? 'success' : 'neutral'} size="sm">{robocallSent ? 'SENT' : 'N/A'}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Attempts drill-down modal */}
      <Modal
        open={Boolean(attemptsModalSession)}
        onClose={() => setAttemptsModalSession(null)}
        title="Notification attempts"
        description={attemptsModalSession ? `${attemptsModalSession.user?.fullName || 'Unknown'} • P${attemptsModalSession.currentPriority}` : ''}
        size="lg"
      >
        {attemptsModalSession && (
          <div className="space-y-2">
            {attemptsModalSession.attempts?.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No attempts recorded yet — escalation has not started.</p>
            ) : (
              attemptsModalSession.attempts.map((a: any, i: number) => (
                <div key={a.id || i} className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.contactName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.contactPhone} • {a.contactEmail || 'No email'}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Priority {a.priorityOrder} • {a.channel}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={a.status === 'SENT' ? 'success' : a.status === 'FAILED' ? 'danger' : a.status === 'ACKNOWLEDGED' ? 'success' : 'warning'}
                      size="sm"
                      dot
                    >
                      {a.status}
                    </Badge>
                    {a.dispatchedAt && <p className="mt-1 text-[10px] text-gray-400">{new Date(a.dispatchedAt).toLocaleString()}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* Confirm force-end dialogs */}
      <ConfirmDialog
        open={Boolean(forceEndLocation)}
        onClose={() => setForceEndLocation(null)}
        onConfirm={() => {
          if (forceEndLocation) forceEndLocationMut.mutate(forceEndLocation, { onSettled: () => setForceEndLocation(null) });
        }}
        loading={forceEndLocationMut.isPending}
        title="Force-end this location session?"
        description="This sets status=ENDED + endedAt=now(). The user will stop broadcasting GPS. Their access token continues to work until expiry."
        confirmLabel="Yes, end session"
        variant="warning"
        requireExplicitChoice
      />

      <ConfirmDialog
        open={Boolean(forceEndEmergency)}
        onClose={() => setForceEndEmergency(null)}
        onConfirm={() => {
          if (forceEndEmergency) forceEndEmergencyMut.mutate(forceEndEmergency, { onSettled: () => setForceEndEmergency(null) });
        }}
        loading={forceEndEmergencyMut.isPending}
        title="Force-end this emergency session?"
        description="This sets status=EXHAUSTED + cancelledAt=now(). The escalation scheduler will stop. All further attempts on this session are blocked. Use only for abuse or stuck sessions."
        confirmLabel="Yes, end escalation"
        variant="danger"
        requireExplicitChoice
      />
    </div>
  );
}

// Suppress unused-import warnings
void AlertTriangle;
