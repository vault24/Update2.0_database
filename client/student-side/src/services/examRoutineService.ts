/**
 * Exam Routine Service (student-side).
 *
 * The personalized exam routine is generated server-side from the imported
 * BTEB routine + the student's semester/technology (Subject catalog) +
 * referred subjects (result database). The client just renders it.
 *
 * Distinct from routineService.ts, which handles the daily CLASS schedule.
 */
import { apiClient } from '@/lib/api';

export interface RoutineExam {
  subjectCode: string;
  subjectName: string;
  credit: number | null;
  subjectSemester: number | null;
  date: string;        // ISO yyyy-mm-dd
  weekday: string;     // e.g. "Thursday"
  startTime: string;   // "10:00"
  endTime: string;     // "13:00"
  durationMinutes: number;
  slot: string;        // "morning" | "afternoon"
  section: string;     // "theory"
  examKind: string;    // "Theory"
  isReferred: boolean;
}

export interface ExamRoutineMeta {
  examType: string;
  regulationYear: number | null;
  examSession: string;
  publicationDate: string | null;
  examStartDate: string | null;
  examEndDate: string | null;
}

export interface MyExamRoutineResponse {
  available: boolean;
  reason?: string;
  examType: string;
  routine?: ExamRoutineMeta;
  technologyResolved?: boolean;
  note?: string;
  regularCount?: number;
  referredCount?: number;
  totalExams?: number;
  exams?: RoutineExam[];
  /** 'enrolled' (exact) | 'selected' (tech+semester picker) | 'inferred' (best-effort). */
  source?: 'enrolled' | 'selected' | 'inferred';
  roll?: string;
  inferredSemester?: number | null;
  selectedTech?: string;
  selectedSemester?: number;
  studentName?: string;
  department?: string;
  semesterNumber?: number;
  student?: {
    name: string;
    roll: string;
    semester: number;
    department: string;
  };
}

class ExamRoutineService {
  private baseURL = '/routines';

  /** The logged-in student's personalized exam routine. */
  async getMyRoutine(examType: 'final' | 'mid' = 'final'): Promise<MyExamRoutineResponse> {
    return await apiClient.get<MyExamRoutineResponse>(
      `${this.baseURL}/my/?type=${examType}`,
    );
  }

  /** Public personalized routine by roll (no login) — for the result portal.
   *  Optional tech + semester force an exact routine for that curriculum. */
  async getPublicRoutine(
    roll: string,
    opts: { examType?: 'final' | 'mid'; tech?: string; semester?: number } = {},
  ): Promise<MyExamRoutineResponse> {
    const params = new URLSearchParams({ roll, type: opts.examType ?? 'final' });
    if (opts.tech) params.set('tech', opts.tech);
    if (opts.semester) params.set('semester', String(opts.semester));
    return await apiClient.get<MyExamRoutineResponse>(
      `${this.baseURL}/public/my/?${params.toString()}`,
    );
  }

  /** Technologies + semesters for the routine picker (public). */
  async getTechnologies(): Promise<{
    regulationYear: number | null;
    technologies: { techCode: string; name: string }[];
    semesters: number[];
  }> {
    return await apiClient.get(`${this.baseURL}/public/technologies/`);
  }
}

export const examRoutineService = new ExamRoutineService();
export default examRoutineService;
