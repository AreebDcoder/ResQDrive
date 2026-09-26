import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type {
  AnalyticsSummary,
  AnalyticsTrend,
  AnalyticsHotspot,
  ExtendedDashboardSummary,
} from '../types';

/**
 * useDashboardData — single source of truth for all Dashboard data fetching.
 *
 * Uses TanStack Query for:
 *   - Cache (30s default — refresh when user navigates away and back)
 *   - Retry (1 retry on failure)
 *   - Background refetch when window regains focus
 *   - Auto-invalidate when refresh button is clicked (via queryKey)
 *
 * All requests fire in parallel (4 separate queries) so the dashboard
 * streams in card-by-card instead of waiting for everything to resolve.
 *
 * Date range is passed only to endpoints that support it (summary + hotspots).
 * trends + extended-summary ignore the date range (trends is fixed 30-day,
 * extended-summary returns all-time totals).
 */

export interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

/** Build URL query string from DateRange, skipping empty values */
function rangeToQuery(range: DateRange | undefined): string {
  if (!range) return '';
  const params = new URLSearchParams();
  if (range.dateFrom) params.set('dateFrom', range.dateFrom);
  if (range.dateTo) params.set('dateTo', range.dateTo);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useDashboardSummary(range?: DateRange) {
  return useQuery<AnalyticsSummary>({
    queryKey: ['dashboard', 'summary', range],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/summary${rangeToQuery(range)}`);
      return res.data;
    },
  });
}

export function useDashboardTrends() {
  // trends endpoint always returns last 30 days — no date filter applied
  return useQuery<AnalyticsTrend[]>({
    queryKey: ['dashboard', 'trends'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/trends');
      return res.data;
    },
  });
}

export function useDashboardHotspots(range?: DateRange) {
  return useQuery<AnalyticsHotspot[]>({
    queryKey: ['dashboard', 'hotspots', range],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/hotspots${rangeToQuery(range)}`);
      return res.data;
    },
  });
}

export function useExtendedDashboardSummary() {
  // extended-summary endpoint doesn't accept date range — returns all-time totals
  return useQuery<ExtendedDashboardSummary>({
    queryKey: ['dashboard', 'extended-summary'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard/extended-summary');
      return res.data;
    },
  });
}
