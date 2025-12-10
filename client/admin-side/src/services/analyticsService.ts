/**
 * Analytics Service
 * Handles API requests for analytics and statistics
 */

import { apiClient } from '@/lib/api';

// Types
export interface AdmissionsTrendData {
  month: string;
  count: number;
}

export interface DepartmentDistributionData {
  department__name: string;
  department__code: string;
  count: number;
}

export interface AttendanceSummaryData {
  totalRecords: number;
  presentRecords: number;
  percentage: number;
}

export interface PerformanceMetricsData {
  avg_obtained: number;
  avg_total: number;
}

export interface AnalyticsResponse<T> {
  type: string;
  data: T;
}

export type AnalyticsType = 
  | 'admissions-trend'
  | 'department-distribution'
  | 'attendance-summary'
  | 'performance-metrics';

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  student_count: number;
  teacher_count: number;
}

export interface DashboardStats {
  students: {
    total: number;
    active: number;
    graduated: number;
    discontinued: number;
    byStatus: Array<{ status: string; count: number }>;
    byDepartment: Array<{ department__name: string; department__code: string; count: number }>;
    bySemester: Array<{ semester: number; count: number }>;
  };
  alumni: {
    total: number;
    recent: number;
    established: number;
    bySupport: Record<string, number>;
    byYear: Record<string, number>;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byStatus: Array<{ status: string; count: number }>;
    byType: Array<{ applicationType: string; count: number }>;
  };
  admissions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  teachers: {
    total: number;
  };
  departments: {
    total: number;
  };
}

export interface AdminDashboardData {
  kpis: {
    totalStudents: number;
    activeStudents: number;
    totalTeachers: number;
    totalDepartments: number;
    pendingAdmissions: number;
    pendingApplications: number;
  };
  departmentSummaries: DepartmentSummary[];
  recentAdmissions: number;
  recentApplications: number;
}

// Service
export const analyticsService = {
  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    return await apiClient.get<DashboardStats>('dashboard/stats/');
  },

  /**
   * Get admin dashboard data
   */
  getAdminDashboard: async (department?: string): Promise<AdminDashboardData> => {
    const params = department ? { department } : undefined;
    return await apiClient.get<AdminDashboardData>('dashboard/admin/', params);
  },

  /**
   * Get analytics data by type
   */
  getAnalytics: async (type: AnalyticsType): Promise<AnalyticsResponse<any>> => {
    return await apiClient.get<AnalyticsResponse<any>>('dashboard/analytics/', { type });
  },

  /**
   * Get admissions trend analytics
   */
  getAdmissionsTrend: async (): Promise<AdmissionsTrendData[]> => {
    const response = await apiClient.get<AnalyticsResponse<AdmissionsTrendData[]>>(
      'dashboard/analytics/',
      { type: 'admissions-trend' }
    );
    return response.data;
  },

  /**
   * Get department distribution analytics
   */
  getDepartmentDistribution: async (): Promise<DepartmentDistributionData[]> => {
    const response = await apiClient.get<AnalyticsResponse<DepartmentDistributionData[]>>(
      'dashboard/analytics/',
      { type: 'department-distribution' }
    );
    return response.data;
  },

  /**
   * Get attendance summary analytics
   */
  getAttendanceSummary: async (): Promise<AttendanceSummaryData> => {
    const response = await apiClient.get<AnalyticsResponse<AttendanceSummaryData>>(
      'dashboard/analytics/',
      { type: 'attendance-summary' }
    );
    return response.data;
  },

  /**
   * Get performance metrics analytics
   */
  getPerformanceMetrics: async (): Promise<PerformanceMetricsData> => {
    const response = await apiClient.get<AnalyticsResponse<PerformanceMetricsData>>(
      'dashboard/analytics/',
      { type: 'performance-metrics' }
    );
    return response.data;
  },
};
