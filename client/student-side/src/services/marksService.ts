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
  studentName?: string;
  studentRoll?: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  examType: ExamType;
  marksObtained: number;
  totalMarks: number;
  percentage?: number;
  recordedBy?: string;
  recordedByName?: string;
  recordedAt?: string;
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
  subjectCode: string;
  subjectName: string;
  semester: number;
  examType: ExamType;
  marksObtained: number;
  totalMarks: number;
  recordedBy?: string;
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
   * Bulk create marks records (for teachers)
   */
  bulkCreateMarks: async (records: MarksCreateData[]): Promise<MarksRecord[]> => {
    return await apiClient.post<MarksRecord[]>('marks/bulk_create/', { records });
  },
};
