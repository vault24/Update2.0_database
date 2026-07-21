/**
 * Result Service (student-side)
 *
 * Board (BTEB) results imported by the institute from official result PDFs.
 * - `getMyResults()` — the logged-in student's own result history.
 * - `searchRoll()`   — the public roll search (no login required).
 */

import { apiClient } from '@/lib/api';

// Types

export interface ResultExam {
  id: number;
  semester: number;
  regulationYear: number;
  program: string;
  heldIn: string;
  publicationDate: string | null;
  memoNo: string;
}

export interface ResultInstitute {
  code: string;
  name: string;
}

export interface SemesterGpa {
  semester: number;
  /** Decimal string ("3.25") or null when the semester is referred. */
  gpa: string | null;
  isReferred: boolean;
}

export interface SubjectInfo {
  name: string;
  semester: number;
  credit: number | null;
  technology: string;
  regulationYear: number | null;
  theoryContinuous: number | null;
  theoryFinal: number | null;
  theoryTotal: number | null;
  practicalContinuous: number | null;
  practicalFinal: number | null;
  practicalTotal: number | null;
  totalMarks: number | null;
}

export interface ResultSubject {
  subjectCode: string;
  role: 'referred' | 'expelled' | 'continuous_fail';
  hasTheory: boolean;
  hasPractical: boolean;
  /** Catalog entry (name/credit/marks) — null when the code isn't imported. */
  info?: SubjectInfo | null;
}

export type ResultType =
  | 'passed'
  | 'referred'
  | 'failed'
  | 'expelled'
  | 'continuous_fail';

export interface StudentResult {
  id: number;
  rollNumber: string;
  resultType: ResultType;
  cgpa: string | null;
  expelledRule: string;
  exam: ResultExam;
  institute: ResultInstitute;
  gpas: SemesterGpa[];
  subjects: ResultSubject[];
  /** Institute-wise merit rank for this semester (passed results only). */
  rank?: number | null;
  rankTotal?: number | null;
}

export interface RollSearchResponse {
  roll: string;
  found: boolean;
  /** Known only for this institute's enrolled students. */
  studentName?: string;
  institute: ResultInstitute | null;
  finalCgpa: string | null;
  results: StudentResult[];
}

export interface RecentExam {
  semester: number;
  regulationYear: number;
  program: string;
  heldIn: string;
  publicationDate: string | null;
  resultCount: number;
}

class ResultService {
  private baseURL = '/results';

  /** The logged-in student's own imported result history. */
  async getMyResults(): Promise<RollSearchResponse> {
    return await apiClient.get<RollSearchResponse>(`${this.baseURL}/my/`);
  }

  /** Public search — works without authentication. */
  async searchRoll(roll: string): Promise<RollSearchResponse> {
    return await apiClient.get<RollSearchResponse>(
      `${this.baseURL}/public/search/?roll=${encodeURIComponent(roll)}`,
    );
  }

  /** Recently published examinations (public, cached server-side). */
  async getRecentExams(): Promise<RecentExam[]> {
    return await apiClient.get<RecentExam[]>(`${this.baseURL}/public/exams/`);
  }

  /** Download the clean PDF result card for a roll (public). */
  async downloadResultPdf(roll: string): Promise<void> {
    const { API_BASE_URL } = await import('@/config/api');
    const response = await fetch(
      `${API_BASE_URL}${this.baseURL}/public/download/?roll=${encodeURIComponent(roll)}`,
    );
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BTEB-Result-${roll}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export const resultService = new ResultService();
export default resultService;
