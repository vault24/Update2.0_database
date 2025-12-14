/**
 * Teacher Service (Student-side)
 * Handles API requests for teacher data
 */

import api, { PaginatedResponse } from '@/lib/api';

// Types
export interface Teacher {
  id: string;
  fullNameEnglish: string;
  designation: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  email: string;
  mobileNumber: string;
  officeLocation?: string;
  subjects?: string[];
  employmentStatus: string;
  profilePhoto?: string;
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
