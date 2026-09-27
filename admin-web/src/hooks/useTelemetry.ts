import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

/**
 * useTelemetry — TanStack Query hooks for the 4 telemetry endpoints.
 *
 * All 4 endpoints now support server-side filters + pagination.
 * Backend returns `{ data, total }`.
 *
 * Mutations are minimal — telemetry is generally read-only from admin side
 * (delete only for damage assessments + repair reports). Crash logs + voice
 * logs are immutable (they're ML inference logs, not user-editable).
 */

// ─── Crash Detection Logs ────────────────────────────────────────────────────
export interface CrashLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  flaggedOnly?: boolean;
  className?: string;
  minConfidence?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function useCrashLogs(params: CrashLogListParams = {}) {
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ['crash-logs', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/crash-detection-logs', {
        params: {
          limit: params.limit ?? 20,
          skip: ((params.page ?? 1) - 1) * (params.limit ?? 20),
          search: params.search,
          userId: params.userId,
          flaggedOnly: params.flaggedOnly ? 'true' : undefined,
          className: params.className,
          minConfidence: params.minConfidence,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Voice Command Logs ──────────────────────────────────────────────────────
export interface VoiceLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  intent?: string;
  engine?: string;
  actionTakenOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export function useVoiceLogs(params: VoiceLogListParams = {}) {
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ['voice-logs', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/voice-command-logs', {
        params: {
          limit: params.limit ?? 20,
          skip: ((params.page ?? 1) - 1) * (params.limit ?? 20),
          search: params.search,
          userId: params.userId,
          intent: params.intent,
          engine: params.engine,
          actionTakenOnly: params.actionTakenOnly ? 'true' : undefined,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Damage Assessments ──────────────────────────────────────────────────────
export interface DamageAssessmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  damageType?: string;
  severity?: string;
  partTag?: string;
  lowConfidenceOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export function useDamageAssessments(params: DamageAssessmentListParams = {}) {
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ['damage-assessments', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/damage-assessments', {
        params: {
          limit: params.limit ?? 20,
          skip: ((params.page ?? 1) - 1) * (params.limit ?? 20),
          search: params.search,
          userId: params.userId,
          damageType: params.damageType,
          severity: params.severity,
          partTag: params.partTag,
          lowConfidenceOnly: params.lowConfidenceOnly ? 'true' : undefined,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Repair Cost Reports ─────────────────────────────────────────────────────
export interface RepairReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  vehicleId?: string;
  damageType?: string;
  severity?: string;
  minCost?: number;
  maxCost?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function useRepairReports(params: RepairReportListParams = {}) {
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ['repair-reports', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/repair-cost-reports', {
        params: {
          limit: params.limit ?? 20,
          skip: ((params.page ?? 1) - 1) * (params.limit ?? 20),
          search: params.search,
          userId: params.userId,
          vehicleId: params.vehicleId,
          damageType: params.damageType,
          severity: params.severity,
          minCost: params.minCost,
          maxCost: params.maxCost,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Repair report PDF download ─────────────────────────────────────────────
import { apiDownloadAndSave } from '../api';

export async function downloadRepairReportPdf(id: string) {
  await apiDownloadAndSave(`/repair-cost/report/${id}/pdf`, `repair-cost-${id}.pdf`);
}
