/**
 * Marks Service
 * Handles API requests for marks/grades management
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export type ExamType = 'midterm' | 'final' | 'assignment' | 'practical' | 'quiz';

export interface MarksRecord {
  id: string;
  student: string;
  studentName?: string;
  studentRoll?: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  exam_type: ExamType;
  marks_obtained: number;
  total_marks: number;
  percentage?: number;
  recorded_by?: string;
  recordedByName?: string;
  recorded_at?: string;
  remarks?: string;
}

export interface MarksFilters {
  page?: number;
  page_size?: number;
  student?: string;
  subject_code?: string;
  semester?: number;
  exam_type?: ExamType;
  ordering?: string;
}

export interface MarksCreateData {
  student: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  exam_type: ExamType;
  marks_obtained: number;
  total_marks: number;
  recorded_by?: string;
  remarks?: string;
}

export interface StudentMarksResponse {
  marks: MarksRecord[];
}

// Service
export const marksService = {
  /**
   * Get paginated list of marks records
   */
  getMarks: async (filters?: MarksFilters): Promise<PaginatedResponse<MarksRecord>> => {
    return await apiClient.get<PaginatedResponse<MarksRecord>>('marks/', filters);
  },

  /**
   * Get single marks record by ID
   */
  getMarksRecord: async (id: string): Promise<MarksRecord> => {
    return await apiClient.get<MarksRecord>(`marks/${id}/`);
  },

  /**
   * Create marks record
   */
  createMarks: async (data: MarksCreateData): Promise<MarksRecord> => {
    return await apiClient.post<MarksRecord>('marks/', data);
  },

  /**
   * Update marks record
   */
  updateMarks: async (id: string, data: Partial<MarksCreateData>): Promise<MarksRecord> => {
    return await apiClient.patch<MarksRecord>(`marks/${id}/`, data);
  },

  /**
   * Delete marks record
   */
  deleteMarks: async (id: string): Promise<void> => {
    return await apiClient.delete<void>(`marks/${id}/`);
  },

  /**
   * Get marks for a specific student
   */
  getStudentMarks: async (studentId: string, semester?: number): Promise<StudentMarksResponse> => {
    const params: any = { student: studentId };
    if (semester) {
      params.semester = semester;
    }
    return await apiClient.get<StudentMarksResponse>('marks/student_marks/', params);
  },

  /**
   * Bulk create marks records
   */
  bulkCreateMarks: async (records: MarksCreateData[]): Promise<MarksRecord[]> => {
    return await apiClient.post<MarksRecord[]>('marks/bulk_create/', { records });
  },
};
