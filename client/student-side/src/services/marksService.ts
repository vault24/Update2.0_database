/**
 * Marks Service
 * Handles API requests for marks/grades management (Student-side)
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export type ExamType = 'midterm' | 'final' | 'assignment' | 'practical' | 'quiz';

export interface MarksRecord {
  id: string;
  student: string;
  student_name?: string;
  student_roll?: string;
  subject_code: string;
  subject_name: string;
  semester: number;
  exam_type: ExamType;
  marks_obtained: number;
  total_marks: number;
  percentage?: number;
  recorded_by?: string;
  recorded_by_name?: string;
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
   * Get my marks (for logged-in student)
   */
  getMyMarks: async (filters?: MarksFilters): Promise<PaginatedResponse<MarksRecord>> => {
    return await apiClient.get<PaginatedResponse<MarksRecord>>('marks/', filters);
  },

  /**
   * Get marks records (for teachers)
   */
  getMarks: async (filters?: MarksFilters): Promise<PaginatedResponse<MarksRecord>> => {
    return await apiClient.get<PaginatedResponse<MarksRecord>>('marks/', filters);
  },

  /**
   * Create marks record (for teachers)
   */
  createMarks: async (data: MarksCreateData): Promise<MarksRecord> => {
    return await apiClient.post<MarksRecord>('marks/', data);
  },

  /**
   * Update marks record (for teachers)
   */
  updateMarks: async (id: string, data: Partial<MarksCreateData>): Promise<MarksRecord> => {
    return await apiClient.patch<MarksRecord>(`marks/${id}/`, data);
  },

  /**
   * Delete marks record (for teachers)
   */
  deleteMarks: async (id: string): Promise<void> => {
    return await apiClient.delete<void>(`marks/${id}/`);
  },

  /**
   * Get marks for a specific student (for teachers)
   */
  getStudentMarks: async (studentId: string, semester?: number): Promise<StudentMarksResponse> => {
    const params: any = { student: studentId };
    if (semester) {
      params.semester = semester;
    }
    return await apiClient.get<StudentMarksResponse>('marks/student_marks/', params);
  },

  /**
   * Bulk create/update marks records in one request (for teachers).
   * Records that include an `id` are updated; the rest are created.
   */
  bulkUpsertMarks: async (
    records: Array<Partial<MarksCreateData> & { id?: string }>
  ): Promise<{ saved: number; errors: Array<{ index: number; student: string; error: string }>; records: MarksRecord[] }> => {
    return await apiClient.post('marks/bulk_upsert/', { records });
  },
};
