/**
 * Attendance Service
 * Handles API requests for attendance management
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export interface AttendanceRecord {
  id: string;
  student: string;
  studentName?: string;
  studentRoll?: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  date: string;
  isPresent: boolean;
  recordedBy?: string;
  recordedAt?: string;
  notes?: string;
}

export interface AttendanceFilters {
  page?: number;
  page_size?: number;
  student?: string;
  subject_code?: string;
  semester?: number;
  date?: string;
  is_present?: boolean;
  ordering?: string;
}

export interface AttendanceCreateData {
  student: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  date: string;
  isPresent: boolean;
  notes?: string;
}

export interface AttendanceSummaryItem {
  subject_code: string;
  subject_name: string;
  total: number;
  present: number;
  percentage: number;
}

export interface AttendanceSummary {
  summary: AttendanceSummaryItem[];
}

// Service
export const attendanceService = {
  /**
   * Get paginated list of attendance records
   */
  getAttendance: async (filters?: AttendanceFilters): Promise<PaginatedResponse<AttendanceRecord>> => {
    return await apiClient.get<PaginatedResponse<AttendanceRecord>>('attendance/', filters);
  },

  /**
   * Get single attendance record by ID
   */
  getAttendanceRecord: async (id: string): Promise<AttendanceRecord> => {
    return await apiClient.get<AttendanceRecord>(`attendance/${id}/`);
  },

  /**
   * Mark attendance (create record)
   */
  markAttendance: async (data: AttendanceCreateData): Promise<AttendanceRecord> => {
    return await apiClient.post<AttendanceRecord>('attendance/', data);
  },

  /**
   * Bulk mark attendance for multiple students
   */
  bulkMarkAttendance: async (records: AttendanceCreateData[]): Promise<AttendanceRecord[]> => {
    return await apiClient.post<AttendanceRecord[]>('attendance/bulk_create/', { records });
  },

  /**
   * Update attendance record
   */
  updateAttendance: async (id: string, data: Partial<AttendanceCreateData>): Promise<AttendanceRecord> => {
    return await apiClient.patch<AttendanceRecord>(`attendance/${id}/`, data);
  },

  /**
   * Delete attendance record
   */
  deleteAttendance: async (id: string): Promise<void> => {
    return await apiClient.delete<void>(`attendance/${id}/`);
  },

  /**
   * Get attendance summary for a student
   */
  getStudentSummary: async (studentId: string): Promise<AttendanceSummary> => {
    return await apiClient.get<AttendanceSummary>('attendance/student_summary/', { student: studentId });
  },
};
