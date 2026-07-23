/**
 * Result Service (admin)
 *
 * BTEB board-result imports and roll search. Backed by apps.results:
 * an admin uploads the official BTEB result PDF, the server parses every
 * institute's records, and matching student profiles sync automatically.
 */

import { apiClient } from '@/lib/api';
import { API_BASE_URL } from '@/config/api';

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
  rank?: number | null;
  rankTotal?: number | null;
}

export interface RollSearchResponse {
  roll: string;
  found: boolean;
  studentName?: string;
  institute: ResultInstitute | null;
  finalCgpa: string | null;
  results: StudentResult[];
}

export interface ResultImport {
  id: string;
  fileName: string;
  pageCount: number;
  status: 'processing' | 'completed' | 'failed';
  stats: {
    pageCount?: number;
    instituteCount?: number;
    recordCount?: number;
    recordsByType?: Record<string, number>;
    issuesBySeverity?: Record<string, number>;
    replacedExisting?: number;
    sync?: { matchedStudents: number; updatedStudents: number };
    timings?: Record<string, number>;
  };
  errorMessage: string;
  exam: ResultExam | null;
  uploadedByName: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ParserIssue {
  id: number;
  severity: 'error' | 'warning' | 'info';
  stage: string;
  code: string;
  message: string;
  context: string;
  rollNumber: string;
  createdAt: string;
}

export interface ResultBucket {
  appeared: number;
  passed: number;
  referred: number;
  failed: number;
  expelled: number;
  continuousFail: number;
  passRate: number | null;
  avgGpa: number | null;
  avgCgpa: number | null;
}

export interface DepartmentSummary extends ResultBucket {
  id: string;
  name: string;
  code: string;
  shifts: Record<string, { appeared: number; passed: number; passRate: number | null }>;
}

export interface SemesterOption {
  semester: number;
  label: string;
  students: number;
}

export interface AnalyticsSummary {
  semester: number;
  label: string;
  institute: ResultBucket;
  departments: DepartmentSummary[];
  topFailedSubjects: { subjectCode: string; students: number }[];
  topPerformers: {
    roll: string;
    name: string;
    department: string;
    shift: string;
    gpa: string;
    cgpa: string | null;
  }[];
  national: {
    institutes: number;
    records: number;
    passed: number;
    passRate: number | null;
  };
}

export type DownloadFormat = 'pdf' | 'excel';

export interface SubjectImportStats {
  fileName: string;
  technology: string;
  techCode: string;
  regulationYear: number | null;
  semesters: number[];
  created: number;
  updated: number;
  issues: { severity: string; code: string; message: string }[];
}

export interface SubjectStats {
  totalSubjects: number;
  technologies: {
    technology: string;
    techCode: string;
    regulationYear: number | null;
    subjects: number;
    lastUpdated: string;
  }[];
}

export interface SubjectLookup {
  found: boolean;
  code: string;
  name?: string;
  semester?: number;
  credit?: number | null;
  technology?: string;
  /** Distinct semesters this code appears in across technologies. */
  semesters?: number[];
}

class ResultService {
  private baseURL = '/results';

  async searchRoll(roll: string): Promise<RollSearchResponse> {
    return await apiClient.get<RollSearchResponse>(
      `${this.baseURL}/admin/search/?roll=${encodeURIComponent(roll)}`,
    );
  }

  async getImports(): Promise<ResultImport[]> {
    return await apiClient.get<ResultImport[]>(`${this.baseURL}/imports/`);
  }

  async getImport(id: string): Promise<ResultImport> {
    return await apiClient.get<ResultImport>(`${this.baseURL}/imports/${id}/`);
  }

  async getImportIssues(id: string, severity?: string): Promise<ParserIssue[]> {
    const query = severity ? `?severity=${severity}` : '';
    return await apiClient.get<ParserIssue[]>(
      `${this.baseURL}/imports/${id}/issues/${query}`,
    );
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

  /** Semester numbers (1–8…) that have results for our enrolled students. */
  /** Upload one BTEB Probidhan course-structure PDF (subject catalog). */
  async importSubjectPdf(file: File): Promise<SubjectImportStats> {
    const formData = new FormData();
    formData.append('file', file);
    return await apiClient.post(`${this.baseURL}/subjects/import/`, formData);
  }

  async getSubjectStats(): Promise<SubjectStats> {
    return await apiClient.get<SubjectStats>(`${this.baseURL}/subjects/stats/`);
  }

  /**
   * Resolve a subject code to its catalog entry (name, semester, credit…).
   * Used by the routine builder to auto-fill the subject name from a code.
   * `found: false` when the code isn't in the imported course structure.
   */
  async lookupSubject(code: string, semester?: number): Promise<SubjectLookup> {
    const params = new URLSearchParams({ code });
    if (semester != null) params.set('semester', String(semester));
    return await apiClient.get<SubjectLookup>(`${this.baseURL}/subjects/lookup/?${params.toString()}`);
  }

  async getAnalyticsSemesters(): Promise<SemesterOption[]> {
    return await apiClient.get<SemesterOption[]>(`${this.baseURL}/analytics/semesters/`);
  }

  async getAnalyticsSummary(semester: number): Promise<AnalyticsSummary> {
    return await apiClient.get<AnalyticsSummary>(
      `${this.baseURL}/analytics/summary/?semester=${semester}`,
    );
  }

  /**
   * Download the result sheet (PDF or Excel) for a semester, optionally
   * filtered by department and shift. Fetched as a blob (with the admin
   * portal header + session cookie) and saved client-side.
   */
  async downloadSheet(
    semester: number,
    options?: { departmentId?: string; shift?: string; format?: DownloadFormat },
  ): Promise<void> {
    const params = new URLSearchParams({ semester: String(semester) });
    if (options?.departmentId) params.set('department', options.departmentId);
    if (options?.shift) params.set('shift', options.shift);
    params.set('type', options?.format === 'excel' ? 'excel' : 'pdf');

    const response = await fetch(
      `${API_BASE_URL}${this.baseURL}/analytics/download/?${params.toString()}`,
      { credentials: 'include', headers: { 'X-Portal': 'admin' } },
    );
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      match?.[1] ?? `result_sheet.${options?.format === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export const resultService = new ResultService();
export default resultService;
