/**
 * Dashboard Service
 * Handles API requests for dashboard statistics (Student-side)
 */

import { apiClient } from '@/lib/api';

// Types
export interface StudentDashboardData {
  student: {
    id: string;
    name: string;
    rollNumber: string;
    department: string;
    semester: number;
  };
  attendance: {
    totalClasses: number;
    presentClasses: number;
    percentage: number;
  };
  marks: {
    totalRecords: number;
  };
  applications: {
    pending: number;
  };
  routine: {
    totalClasses: number;
  };
}

export interface TeacherDashboardData {
  teacher: {
    id: string;
    name: string;
    designation: string;
    department: string | null;
  };
  assignedClasses: {
    total: number;
    departments: Array<{ department__name: string }>;
    semesters: Array<{ semester: number }>;
  };
  students: {
    total: number;
  };
}

// Service
export const dashboardService = {
  /**
   * Get student dashboard statistics
   */
  getStudentStats: async (studentId: string): Promise<StudentDashboardData> => {
    return await apiClient.get<StudentDashboardData>('dashboard/student/', { student: studentId });
  },

  /**
   * Get teacher dashboard statistics
   */
  getTeacherStats: async (teacherId: string): Promise<TeacherDashboardData> => {
    return await apiClient.get<TeacherDashboardData>('dashboard/teacher/', { teacher: teacherId });
  },
};
