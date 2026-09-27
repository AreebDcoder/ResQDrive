import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Inbox, X, Image as ImageIcon, AlertTriangle, ZoomIn,
} from 'lucide-react';
import { useDamageAssessments } from '../hooks/useTelemetry';
import { ChartContainer } from '../components/charts/ChartContainer';
import { DonutChart } from '../components/charts/DonutChart';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

type DamageAssessment = {
  id: string;
  userId: string;
  vehicleId?: string | null;
  photoUrl: string;
  predictedDamageType: string;
  confidenceScore: number;
  derivedSeverity: string;
  inferenceTimeMs?: number | null;
  modelVersion: string;
  partTag: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
  vehicle?: { id: string; make: string; model: string; year: number; licensePlate: string } | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#fbbf24',
  moderate: '#fb923c',
  severe: '#ef4444',
};

const DAMAGE_TYPE_COLORS: Record<string, string> = {
  scratch: '#fbbf24',
  dent: '#f59e0b',
  lamp_broken: '#0ea5e9',
  tire_flat: '#10b981',
  crack: '#ef4444',
  glass_shatter: '#dc2626',
};

export default function DamageAssessmentPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24); // 24 = good for masonry grid (4 cols × 6 rows on desktop)
  const [search, setSearch] = useState('');
  const [damageType, setDamageType] = useState('');
  const [severity, setSeverity] = useState('');
  const [lowConfidenceOnly, setLowConfidenceOnly] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState<DamageAssessment | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useDamageAssessments({
    page,
    limit: pageSize,
    search: search || undefined,
    damageType: damageType || undefined,
    severity: severity || undefined,
    lowConfidenceOnly: lowConfidenceOnly || undefined,
  });

  // Severity distribution donut (current page)
  const severityDonut = useMemo(() => {
    const counts: Record<string, number> = { minor: 0, moderate: 0, severe: 0 };
    (data?.data || []).forEach((a: any) => {
      counts[a.derivedSeverity] = (counts[a.derivedSeverity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name] || '#9ca3af',
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Damage assessments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {data?.total ?? '—'} ML damage assessments (cardd_v1 YOLO). {isFetching && !isLoading ? 'Syncing…' : ''}
        </p>
      </div>

      {/* Severity donut chart */}
      <ChartContainer title="Severity distribution (current page)" description="Minor / Moderate / Severe breakdown" isLoading={isLoading} isEmpty={severityDonut.every((d) => d.value === 0)} height={240}>
        <DonutChart data={severityDonut} />
      </ChartContainer>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input id="search" label="Search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="User name, user email, vehicle make/model..." leftIcon={<Search size={14} />} />
        </div>
        <div className="w-44">
          <Select id="damage-type" label="Damage type" value={damageType} onChange={(e) => { setDamageType(e.target.value); setPage(1); }} options={[
            { label: 'All types', value: '' },
            { label: 'scratch', value: 'scratch' },
            { label: 'dent', value: 'dent' },
            { label: 'lamp_broken', value: 'lamp_broken' },
            { label: 'tire_flat', value: 'tire_flat' },
            { label: 'crack', value: 'crack' },
            { label: 'glass_shatter', value: 'glass_shatter' },
          ]} />
        </div>
        <div className="w-40">
          <Select id="severity" label="Severity" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} options={[
            { label: 'All severities', value: '' },
            { label: 'minor', value: 'minor' },
            { label: 'moderate', value: 'moderate' },
            { label: 'severe', value: 'severe' },
          ]} />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={lowConfidenceOnly} onChange={(e) => { setLowConfidenceOnly(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            Low confidence only {'<'}60%
          </label>
        </div>
        {(search || damageType || severity || lowConfidenceOnly) && (
          <Button variant="ghost" size="md" onClick={() => { setSearch(''); setDamageType(''); setSeverity(''); setLowConfidenceOnly(false); setPage(1); }} leftIcon={<X size={14} />}>Reset</Button>
        )}
      </div>

      {/* Masonry grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load damage assessments" description={error ? String(error) : undefined} onRetry={() => refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState icon={<ImageIcon size={40} />} title="No damage assessments" description="No ML damage assessments match your filters." action={(search || damageType || severity || lowConfidenceOnly) ? <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setDamageType(''); setSeverity(''); setLowConfidenceOnly(false); setPage(1); }}>Reset filters</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.data.map((a: any) => (
            <button
              key={a.id}
              onClick={() => setZoomPhoto(a)}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-700"
            >
              {/* Photo */}
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={a.photoUrl}
                  alt={`Damage: ${a.predictedDamageType}`}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Severity badge top-left */}
                <div className="absolute left-2 top-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow"
                    style={{ backgroundColor: SEVERITY_COLORS[a.derivedSeverity] || '#6b7280' }}
                  >
                    {a.derivedSeverity}
                  </span>
                </div>
                {/* Zoom icon top-right (appears on hover) */}
                <div className="absolute right-2 top-2 rounded-md bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn size={14} />
                </div>
                {/* Confidence score bottom-left */}
                <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {(a.confidenceScore * 100).toFixed(0)}% conf
                </div>
                {a.confidenceScore < 0.6 && (
                  <div className="absolute bottom-2 right-2 rounded-md bg-warning-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    LOW
                  </div>
                )}
              </div>
              {/* Caption */}
              <div className="p-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DAMAGE_TYPE_COLORS[a.predictedDamageType] || '#6b7280' }} aria-hidden />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{a.predictedDamageType}</p>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{a.partTag}</p>
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{a.user?.fullName || 'Unknown'}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">{pageSize} per page</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page"><ChevronsLeft size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={14} /></Button>
            <span className="px-2 text-sm text-gray-500 dark:text-gray-400">Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of <span className="font-medium text-gray-900 dark:text-white">{Math.ceil(data.total / pageSize)}</span></span>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(Math.ceil(data.total / pageSize), page + 1))} disabled={page >= Math.ceil(data.total / pageSize)} aria-label="Next page"><ChevronRight size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.ceil(data.total / pageSize))} disabled={page >= Math.ceil(data.total / pageSize)} aria-label="Last page"><ChevronsRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Photo zoom modal */}
      <Modal
        open={Boolean(zoomPhoto)}
        onClose={() => setZoomPhoto(null)}
        size="xl"
        title={zoomPhoto ? `${zoomPhoto.predictedDamageType} (${zoomPhoto.derivedSeverity})` : ''}
        description={zoomPhoto ? `${zoomPhoto.partTag} • ${(zoomPhoto.confidenceScore * 100).toFixed(1)}% confidence` : ''}
      >
        {zoomPhoto && (
          <div className="space-y-4">
            <img
              src={zoomPhoto.photoUrl}
              alt={`Damage: ${zoomPhoto.predictedDamageType}`}
              className="mx-auto max-h-[60vh] rounded-lg object-contain"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="User" value={zoomPhoto.user?.fullName || 'Unknown'} />
              <Field label="Vehicle" value={zoomPhoto.vehicle ? `${zoomPhoto.vehicle.make} ${zoomPhoto.vehicle.model} (${zoomPhoto.vehicle.year})` : '—'} />
              <Field label="License plate" value={zoomPhoto.vehicle?.licensePlate || '—'} />
              <Field label="Damage type" value={zoomPhoto.predictedDamageType} />
              <Field label="Severity" value={zoomPhoto.derivedSeverity} />
              <Field label="Part tag" value={zoomPhoto.partTag} />
              <Field label="Confidence" value={`${(zoomPhoto.confidenceScore * 100).toFixed(2)}%`} />
              <Field label="Inference time" value={zoomPhoto.inferenceTimeMs ? `${zoomPhoto.inferenceTimeMs}ms` : '—'} />
              <Field label="Model version" value={zoomPhoto.modelVersion} />
              <Field label="Created at" value={new Date(zoomPhoto.createdAt).toLocaleString()} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 break-words">{value || '—'}</p>
    </div>
  );
}

// Suppress unused-import warnings
void AlertTriangle; void Badge;
