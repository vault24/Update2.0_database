/**
 * Subject Service
 * Handles API requests for subjects from class routines
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

export interface Subject {
  code: string;
  name: string;
  semester: number;
}

export interface ClassRoutine {
  id: string;
  department: string;
  semester: number;
  shift: string;
  session: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  classType: string;
  labName?: string;
  teacher?: string;
  teacherName?: string;
  roomNumber: string;
  isActive: boolean;
}

export const subjectService = {
  /**
   * Get subjects from teacher's class routines
   */
  getTeacherSubjects: async (teacherId?: string): Promise<Subject[]> => {
    try {
      const params: any = {
        is_active: true,
        page_size: 1000,
        ordering: 'semester,subject_code'
      };
      
      if (teacherId) {
        params.teacher = teacherId;
      }
      
      console.log('Fetching class routines with params:', params);
      const response = await apiClient.get<PaginatedResponse<ClassRoutine>>('class-routines/', params);
      console.log('Class routines response:', response);
      
      // Extract unique subjects - handle both camelCase and snake_case
      const subjectsMap = new Map<string, Subject>();
      response.results.forEach((routine: any) => {
        // Handle both camelCase and snake_case field names
        const subjectCode = routine.subjectCode || routine.subject_code || '';
        const subjectName = routine.subjectName || routine.subject_name || '';
        const semester = routine.semester || 0;
        
        if (!subjectCode || !subjectName) {
          console.warn('Skipping routine with missing subject info:', routine);
          return;
        }
        
        const key = `${subjectCode}_${semester}`;
        if (!subjectsMap.has(key)) {
          subjectsMap.set(key, {
            code: subjectCode,
            name: subjectName,
            semester: semester
          });
        }
      });
      
      const subjects = Array.from(subjectsMap.values()).sort((a, b) => {
        if (a.semester !== b.semester) return a.semester - b.semester;
        return a.code.localeCompare(b.code);
      });
      
      console.log('Extracted subjects:', subjects);
      return subjects;
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
      throw error;
    }
  },

  /**
   * Get available semesters from teacher's routines
   */
  getTeacherSemesters: async (teacherId?: string): Promise<number[]> => {
    try {
      const subjects = await subjectService.getTeacherSubjects(teacherId);
      const semesters = new Set<number>();
      subjects.forEach(subject => semesters.add(subject.semester));
      return Array.from(semesters).sort((a, b) => a - b);
    } catch (error) {
      console.error('Error fetching teacher semesters:', error);
      throw error;
    }
  },

  /**
   * Get subjects by semester for a teacher
   */
  getTeacherSubjectsBySemester: async (semester: number, teacherId?: string): Promise<Subject[]> => {
    const subjects = await subjectService.getTeacherSubjects(teacherId);
    return subjects.filter(s => s.semester === semester);
  },
};

