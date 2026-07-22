/**
 * Exam Routine Service (admin).
 *
 * Import BTEB exam routine PDFs. Mirrors resultService's import flow: the
 * server parses the routine and personalizes each student's schedule; the
 * admin uploads, watches progress, and reviews parser issues.
 */
import { apiClient } from '@/lib/api';

export interface RoutineImport {
  id: string;
  fileName: string;
  examType: 'final' | 'mid';
  regulationYear: number | null;
  examSession: string;
  memoNo: string;
  publicationDate: string | null;
  examStartDate: string | null;
  examEndDate: string | null;
  pageCount: number;
  status: 'processing' | 'completed' | 'failed';
  isActive: boolean;
  stats: {
    sessionCount?: number;
    subjectCount?: number;
    sessionsBySection?: Record<string, number>;
    issuesBySeverity?: Record<string, number>;
    examStartDate?: string | null;
    examEndDate?: string | null;
    timings?: Record<string, number>;
  };
  errorMessage: string;
  uploadedByName: string;
  createdAt: string;
  completedAt: string | null;
}

export interface RoutineParserIssue {
  id: number;
  severity: 'error' | 'warning' | 'info';
  stage: string;
  code: string;
  message: string;
  context: string;
  createdAt: string;
}

class ExamRoutineService {
  private baseURL = '/routines';

  async getImports(): Promise<RoutineImport[]> {
    return await apiClient.get<RoutineImport[]>(`${this.baseURL}/imports/`);
  }

  async getImportIssues(id: string): Promise<RoutineParserIssue[]> {
    return await apiClient.get<RoutineParserIssue[]>(`${this.baseURL}/imports/${id}/issues/`);
  }

  async uploadPdf(file: File, replace = false): Promise<{ importId: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (replace) formData.append('replace', 'true');
    return await apiClient.post(`${this.baseURL}/imports/`, formData);
  }

  async deleteImport(id: string): Promise<void> {
    return await apiClient.delete<void>(`${this.baseURL}/imports/${id}/`);
  }
}

export const examRoutineService = new ExamRoutineService();
export default examRoutineService;
