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

export interface ResultSubject {
  subjectCode: string;
  role: 'referred' | 'expelled' | 'continuous_fail';
  hasTheory: boolean;
  hasPractical: boolean;
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
}

export interface RollSearchResponse {
  roll: string;
  found: boolean;
  institute: ResultInstitute | null;
  finalCgpa: string | null;
  results: StudentResult[];
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
}

export const resultService = new ResultService();
export default resultService;
