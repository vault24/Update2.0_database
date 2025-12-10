/**
 * Activity Log Service
 * Handles API requests for activity logs
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export interface ActivityLog {
  id: string;
  user: string | null;
  userName?: string;
  actionType: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | 'logout';
  entityType: string;
  entityId: string;
  description: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ActivityLogFilters {
  page?: number;
  page_size?: number;
  user?: string;
  action_type?: string;
  entity_type?: string;
  ordering?: string;
}

// Service
export const activityLogService = {
  /**
   * Get paginated list of activity logs
   */
  getActivityLogs: async (filters?: ActivityLogFilters): Promise<PaginatedResponse<ActivityLog>> => {
    return await apiClient.get<PaginatedResponse<ActivityLog>>('activity-logs/', filters);
  },

  /**
   * Get single activity log by ID
   */
  getActivityLog: async (id: string): Promise<ActivityLog> => {
    return await apiClient.get<ActivityLog>(`activity-logs/${id}/`);
  },

  /**
   * Export activity logs to CSV
   */
  exportActivityLogs: async (filters?: ActivityLogFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${apiClient['baseURL']}/activity-logs/export/?${params.toString()}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export activity logs');
    }

    return await response.blob();
  },
};
