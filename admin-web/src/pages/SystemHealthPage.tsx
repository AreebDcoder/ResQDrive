import { CheckCircle2, XCircle, RefreshCw, AlertTriangle, Trash2, HeartPulse, Activity } from 'lucide-react';
import { useSystemHealth, usePurgeStaleTokens } from '../hooks/useAdminOps';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

/**
 * SystemHealthPage — service status dashboard.
 *
 * Reads from /alert-dispatch/health (publicly accessible — exposes devMode flag).
 * Auto-refreshes every 30s via useSystemHealth's refetchInterval.
 *
 * New in Batch 8:
 *   - Theme-aware (light/dark)
 *   - Card grid for service status
 *   - "Purge stale device tokens" button (uses usePurgeStaleTokens mutation)
 *   - Live indicator + last-updated timestamp
 *   - Dev-mode warning banner (more prominent)
 */
export default function SystemHealthPage() {
  const { data: health, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useSystemHealth();
  const purgeMut = usePurgeStaleTokens();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
        </div>
      </div>
    );
  }
  if (isError || !health) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 dark:border-danger-800 dark:bg-danger-900/20">
        <p className="text-sm text-danger-700 dark:text-danger-300">Failed to load system health.</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-2">Retry</Button>
      </div>
    );
  }

  const allChannels = { ...health.channels, ...health.services };
  const configuredCount = Object.values(allChannels).filter((v: any) => v.configured).length;
  const totalCount = Object.keys(allChannels).length;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System health</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdated} {isFetching && <span className="text-primary-500">(syncing…)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={'h-2 w-2 rounded-full ' + (health.devMode ? 'bg-warning-500' : 'bg-success-500 animate-pulse')} />
            <span className={'text-xs font-medium ' + (health.devMode ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400')}>
              {health.devMode ? 'DEV MODE' : 'LIVE'}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}>Refresh</Button>
        </div>
      </div>

      {/* Dev-mode warning */}
      {health.devMode && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning-600 dark:text-warning-400" />
          <div>
            <p className="font-semibold text-sm text-warning-700 dark:text-warning-300">DEV MODE ACTIVE</p>
            <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
              Some services are not configured with real credentials. Emergency alerts will fall back to device-level channels (auto-call + background SMS) instead of server-side WhatsApp/email.
              Set the missing env vars (SMTP_*, WHATSAPP_*, FIREBASE_*, ROBOSMS_*) in your .env file to enable server-side dispatch.
            </p>
          </div>
        </div>
      )}

      {/* Summary card */}
      <Card className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-white">
            <HeartPulse size={28} />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {configuredCount}<span className="text-gray-400 text-xl">/{totalCount}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">services configured</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Coverage</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round((configuredCount / Math.max(1, totalCount)) * 100)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Service status grid */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Activity size={16} /> Service status ({totalCount})
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(allChannels).map(([key, value]: [string, any]) => (
            <div
              key={key}
              className={
                'rounded-xl border p-4 ' +
                (value.configured
                  ? 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20'
                  : 'border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20')
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {value.configured ? (
                    <CheckCircle2 size={20} className="text-success-500" />
                  ) : (
                    <XCircle size={20} className="text-danger-500" />
                  )}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{value.label}</span>
                </div>
                <Badge variant={value.configured ? 'success' : 'danger'} size="sm" dot>
                  {value.configured ? 'OK' : 'MISSING'}
                </Badge>
              </div>
              <p className={'mt-2 text-xs ' + (value.configured ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400')}>
                {value.configured ? 'Configured and ready.' : 'Not configured (dev mode fallback).'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance actions */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Maintenance actions</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Operational tools for keeping the system healthy.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => purgeMut.mutate()}
            loading={purgeMut.isPending}
            leftIcon={<Trash2 size={14} />}
          >
            Purge stale device tokens
          </Button>
        </div>
      </Card>

      {totalCount === 0 && (
        <EmptyState
          icon={<HeartPulse size={40} />}
          title="No services configured"
          description="The /alert-dispatch/health endpoint returned no channels or services. Check your backend configuration."
        />
      )}
    </div>
  );
}
