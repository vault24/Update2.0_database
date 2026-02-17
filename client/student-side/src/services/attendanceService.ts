/**
 * Attendance Service
 * Handles API requests for attendance management (Student-side)
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export interface AttendanceRecord {
  id: string;
  student: string;
  student_name?: string;  // Backend uses snake_case
  student_roll?: string;  // Backend uses snake_case
  studentName?: string;   // Keep for backward compatibility
  studentRoll?: string;   // Keep for backward compatibility
  subjectCode: string;
  subjectName: string;
  subject_code?: string;  // Backend uses snake_case
  subject_name?: string;  // Backend uses snake_case
  semester: number;
  date: string;
  isPresent: boolean;
  is_present?: boolean;   // Backend uses snake_case
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'direct';
  recordedBy?: string;
  recorded_by?: string;   // Backend uses snake_case
  recordedByName?: string;
  recorded_by_name?: string;  // Backend uses snake_case
  recordedAt?: string;
  approvedBy?: string;
  approved_by?: string;   // Backend uses snake_case
  approvedByName?: string;
  approved_by_name?: string;  // Backend uses snake_case
  approvedAt?: string;
  rejectionReason?: string;
  rejection_reason?: string;  // Backend uses snake_case
  notes?: string;
  classRoutine?: string;
  class_routine?: string;  // Backend uses snake_case
  routineDetails?: {
    id: string;
    subject_name: string;
    subject_code: string;
    start_time: string;
    end_time: string;
    day_of_week: string;
  };
}

export interface AttendanceFilters {
  page?: number;
  page_size?: number;
  student?: string;
  subject_code?: string;
  semester?: number;
  date?: string;
  is_present?: boolean;
  status?: string;
  class_routine?: string;
  ordering?: string;
}

export interface AttendanceCreateData {
  student: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  date: string;
  isPresent: boolean;
  status?: 'draft' | 'pending' | 'direct';
  notes?: string;
  classRoutineId?: string;
  recordedBy?: string;
}

export interface BulkAttendanceData {
  records: AttendanceCreateData[];
  classRoutineId?: string;
}

export interface AttendanceApprovalData {
  action: 'approve' | 'reject';
  attendanceIds: string[];
  rejectionReason?: string;
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

const normalizeAttendanceRecord = (record: AttendanceRecord): AttendanceRecord => {
  return {
    ...record,
    studentName: record.studentName ?? record.student_name,
    studentRoll: record.studentRoll ?? record.student_roll,
    subjectCode: record.subjectCode ?? record.subject_code ?? '',
    subjectName: record.subjectName ?? record.subject_name ?? '',
    isPresent: record.isPresent ?? record.is_present ?? false,
    recordedBy: record.recordedBy ?? record.recorded_by,
    recordedByName: record.recordedByName ?? record.recorded_by_name,
    approvedBy: record.approvedBy ?? record.approved_by,
    approvedByName: record.approvedByName ?? record.approved_by_name,
    rejectionReason: record.rejectionReason ?? record.rejection_reason,
    classRoutine: record.classRoutine ?? record.class_routine,
  };
};

const normalizeAttendanceRecords = (records: AttendanceRecord[] = []): AttendanceRecord[] => {
  return records.map(normalizeAttendanceRecord);
};

// Service
export const attendanceService = {
  /**
   * Get my attendance records (for logged-in student)
   */
  getMyAttendance: async (filters?: AttendanceFilters): Promise<PaginatedResponse<AttendanceRecord>> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRecord>>('attendance/', filters);
    return {
      ...response,
      results: normalizeAttendanceRecords(response.results),
    };
  },

  /**
   * Get attendance records (for teachers)
   */
  getAttendance: async (filters?: AttendanceFilters): Promise<PaginatedResponse<AttendanceRecord>> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRecord>>('attendance/', filters);
    return {
      ...response,
      results: normalizeAttendanceRecords(response.results),
    };
  },

  /**
   * Mark attendance (for teachers or captains)
   */
  markAttendance: async (data: AttendanceCreateData): Promise<AttendanceRecord> => {
    const response = await apiClient.post<AttendanceRecord>('attendance/', data);
    return normalizeAttendanceRecord(response);
  },

  /**
   * Bulk mark attendance for multiple students (for teachers or captains)
   */
  bulkMarkAttendance: async (data: BulkAttendanceData): Promise<{ created: number; errors: any[]; records: AttendanceRecord[] }> => {
    // Convert camelCase to snake_case for backend
    const payload = {
      records: data.records.map(record => ({
        student: record.student,
        subject_code: record.subjectCode,
        subject_name: record.subjectName,
        semester: record.semester,
        date: record.date,
        is_present: record.isPresent,
        status: record.status,
        recorded_by: record.recordedBy,
        notes: record.notes,
      })),
      class_routine_id: data.classRoutineId,
    };
    const response = await apiClient.post<{ created: number; errors: any[]; records: AttendanceRecord[] }>('attendance/bulk_create/', payload);
    return {
      ...response,
      records: normalizeAttendanceRecords(response.records),
    };
  },

  /**
   * Update attendance record (for teachers)
   */
  updateAttendance: async (id: string, data: Partial<AttendanceCreateData>): Promise<AttendanceRecord> => {
    // Convert camelCase to snake_case for backend
    const payload: any = {};
    if (data.student !== undefined) payload.student = data.student;
    if (data.subjectCode !== undefined) payload.subject_code = data.subjectCode;
    if (data.subjectName !== undefined) payload.subject_name = data.subjectName;
    if (data.semester !== undefined) payload.semester = data.semester;
    if (data.date !== undefined) payload.date = data.date;
    if (data.isPresent !== undefined) payload.is_present = data.isPresent;
    if (data.status !== undefined) payload.status = data.status;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.classRoutineId !== undefined) payload.class_routine_id = data.classRoutineId;
    if (data.recordedBy !== undefined) payload.recorded_by = data.recordedBy;
    
    const response = await apiClient.patch<AttendanceRecord>(`attendance/${id}/`, payload);
    return normalizeAttendanceRecord(response);
  },

  /**
   * Get my attendance summary
   */
  getMySummary: async (studentId: string): Promise<AttendanceSummary> => {
    return await apiClient.get<AttendanceSummary>('attendance/student_summary/', { student: studentId });
  },

  /**
   * Get attendance summary for a student (for teachers)
   */
  getStudentSummary: async (studentId: string): Promise<AttendanceSummary> => {
    return await apiClient.get<AttendanceSummary>('attendance/student_summary/', { student: studentId });
  },

  /**
   * Get pending attendance records awaiting approval (for teachers)
   */
  getPendingApprovals: async (filters?: { subject_code?: string; date?: string }): Promise<{ count: number; records: AttendanceRecord[] }> => {
    const response = await apiClient.get<{ count: number; records: AttendanceRecord[] }>('attendance/pending_approvals/', filters);
    return {
      ...response,
      records: normalizeAttendanceRecords(response.records),
    };
  },

  /**
   * Approve or reject attendance records (for teachers)
   */
  approveAttendance: async (data: AttendanceApprovalData): Promise<{ message: string; updated: number }> => {
    // Convert camelCase to snake_case for backend
    const payload = {
      action: data.action,
      attendance_ids: data.attendanceIds,
      rejection_reason: data.rejectionReason,
    };
    return await apiClient.post<{ message: string; updated: number }>('attendance/approve_attendance/', payload);
  },

  /**
   * Get attendance records for a specific routine
   */
  getByRoutine: async (
    routineId: string,
    date?: string,
    statuses?: Array<'draft' | 'pending' | 'approved' | 'rejected' | 'direct'>
  ): Promise<AttendanceRecord[]> => {
    const params: Record<string, string> = { routine_id: routineId };
    if (date) params.date = date;
    if (statuses && statuses.length > 0) {
      params.status_in = statuses.join(',');
    }
    const response = await apiClient.get<AttendanceRecord[]>('attendance/by_routine/', params);
    return normalizeAttendanceRecords(response);
  },

  /**
   * Get teacher's subject summary with student attendance statistics
   */
  getTeacherSubjectSummary: async (): Promise<{
    subjects: Array<{
      subject_code: string;
      subject_name: string;
      department: string;
      semester: number;
      shift: string;
      routine_id: string;
      total_classes: number;
      students: Array<{
        student_id: string;
        student_name: string;
        student_roll: string;
        present: number;
        absent: number;
        total: number;
        percentage: number;
      }>;
    }>;
  }> => {
    return await apiClient.get('attendance/teacher_subject_summary/');
  },
};
