/**
 * Dashboard Service
 * Handles API requests for dashboard statistics and KPIs
 */

import { apiClient } from '@/lib/api';

// Types
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

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  student_count: number;
  teacher_count: number;
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
export const dashboardService = {
  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    return await apiClient.get<DashboardStats>('dashboard/stats/');
  },

  /**
   * Get admin dashboard data with KPIs
   */
  getAdminDashboard: async (department?: string): Promise<AdminDashboardData> => {
    const params = department ? { department } : undefined;
    return await apiClient.get<AdminDashboardData>('dashboard/admin/', params);
  },
};
