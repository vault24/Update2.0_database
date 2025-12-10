/**
 * Teacher Service (Student-side)
 * Handles API requests for teacher data
 */

import api, { PaginatedResponse } from '@/lib/api';

// Types
export interface Teacher {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  departmentName?: string;
  email: string;
  phone: string;
  officeRoom?: string;
  subjects?: string[];
}

export interface TeacherFilters {
  department?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// Service
export const teacherService = {
  /**
   * Get list of teachers with filters
   */
  getTeachers: async (filters?: TeacherFilters): Promise<PaginatedResponse<Teacher>> => {
    return await api.get<PaginatedResponse<Teacher>>('teachers/', filters);
  },

  /**
   * Get teacher by ID
   */
  getTeacher: async (id: string): Promise<Teacher> => {
    return await api.get<Teacher>(`teachers/${id}/`);
  },
};
