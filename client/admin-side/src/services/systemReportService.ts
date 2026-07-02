/**
 * System Reports Service
 * API client for the centralized system monitoring dashboard.
 */
import { apiClient, PaginatedResponse } from '@/lib/api';

export type ReportSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'ignored';

export interface SystemReport {
  id: string;
  category: string;
  category_display: string;
  severity: ReportSeverity;
  severity_display: string;
  status: ReportStatus;
  status_display: string;
  source: string;
  title: string;
  message: string;
  exception_type: string;
  stack_trace?: string;
  path: string;
  method: string;
  status_code: number | null;
  ip_address?: string | null;
  user_display: string;
  extra?: Record<string, any>;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  resolved_by_name?: string | null;
  resolved_at: string | null;
  resolution_note?: string;
}

export interface ReportFilters {
  category?: string;
  severity?: string;
  status?: string;
  source?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ReportStats {
  totals: {
    all: number;
    open: number;
    investigating: number;
    resolved: number;
    ignored: number;
    critical_active: number;
    high_active: number;
    last_24h: number;
    resolved_7d: number;
  };
  by_severity: Record<string, number>;
  by_category: Array<{ category: string; label: string; count: number }>;
  trend: Array<{ date: string; critical: number; high: number; medium: number; low: number; info: number }>;
  top_recurring: SystemReport[];
}

export interface HealthSnapshot {
  database: { ok: boolean; latency_ms?: number; error?: string };
  cache: { ok: boolean; error?: string };
  realtime: { ok: boolean; error?: string };
  resources: {
    cpu_percent?: number;
    memory_percent?: number;
    memory_used_mb?: number;
    memory_total_mb?: number;
    disk_percent?: number;
    disk_free_gb?: number;
    disk_total_gb?: number;
  };
  psutil_available: boolean;
  checked_at: number;
}

const BASE = '/system-reports';

export const systemReportService = {
  async getReports(filters?: ReportFilters): Promise<PaginatedResponse<SystemReport>> {
    return apiClient.get<PaginatedResponse<SystemReport>>(`${BASE}/`, filters);
  },

  async getReport(id: string): Promise<SystemReport> {
    return apiClient.get<SystemReport>(`${BASE}/${id}/`);
  },

  async createReport(data: {
    category: string;
    severity: ReportSeverity;
    title: string;
    message?: string;
  }): Promise<SystemReport> {
    return apiClient.post<SystemReport>(`${BASE}/`, data);
  },

  async applyAction(
    id: string,
    action: 'resolve' | 'ignore' | 'investigate' | 'reopen' | 'assign',
    options?: { note?: string; assigned_to?: string }
  ): Promise<SystemReport> {
    return apiClient.post<SystemReport>(`${BASE}/${id}/action/`, { action, ...options });
  },

  async bulkAction(
    ids: string[],
    action: 'resolve' | 'ignore' | 'investigate' | 'reopen',
    note?: string
  ): Promise<{ updated: number }> {
    return apiClient.post(`${BASE}/bulk-action/`, { ids, action, note });
  },

  async getStats(): Promise<ReportStats> {
    return apiClient.get<ReportStats>(`${BASE}/stats/`);
  },

  async getTimeline(): Promise<SystemReport[]> {
    return apiClient.get<SystemReport[]>(`${BASE}/timeline/`);
  },

  async getHealth(): Promise<HealthSnapshot> {
    return apiClient.get<HealthSnapshot>(`${BASE}/health/`);
  },

  async exportCsv(filters?: ReportFilters): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await fetch(
      `${(apiClient as any)['baseURL']}${BASE}/export/?${params.toString()}`,
      { method: 'GET', credentials: 'include' }
    );
    if (!response.ok) {
      throw new Error('Failed to export system reports');
    }
    return await response.blob();
  },
};
