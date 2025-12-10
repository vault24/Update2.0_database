/**
 * Alumni Service
 * Handles API requests for alumni management
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export interface CareerPosition {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface SupportHistoryEntry {
  date: string;
  previousCategory: string;
  newCategory: string;
  notes: string;
}

export interface Alumni {
  student: string;
  studentName?: string;
  studentRoll?: string;
  department?: string;
  departmentName?: string;
  alumniType: 'recent' | 'established';
  transitionDate: string;
  graduationYear: number;
  currentSupportCategory: 'receiving_support' | 'needs_extra_support' | 'no_support_needed';
  currentPosition?: CareerPosition;
  careerHistory: CareerPosition[];
  supportHistory: SupportHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AlumniFilters {
  page?: number;
  page_size?: number;
  alumniType?: string;
  currentSupportCategory?: string;
  graduationYear?: number;
  student__department?: string;
  ordering?: string;
}

export interface AlumniStats {
  total: number;
  recent: number;
  established: number;
  bySupport: Record<string, number>;
  byPosition: Record<string, number>;
  byYear: Record<string, number>;
  byDepartment: Record<string, number>;
}

export interface AlumniSearchParams {
  q?: string;
  department?: string;
  graduationYear?: number;
}

export interface AddCareerPositionData {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface UpdateSupportCategoryData {
  category: 'receiving_support' | 'needs_extra_support' | 'no_support_needed';
  notes?: string;
}

// Service
export const alumniService = {
  /**
   * Get paginated list of alumni
   */
  getAlumni: async (filters?: AlumniFilters): Promise<PaginatedResponse<Alumni>> => {
    return await apiClient.get<PaginatedResponse<Alumni>>('alumni/', filters);
  },

  /**
   * Get single alumni by student ID
   */
  getAlumniById: async (studentId: string): Promise<Alumni> => {
    return await apiClient.get<Alumni>(`alumni/${studentId}/`);
  },

  /**
   * Create alumni record
   */
  createAlumni: async (data: Partial<Alumni>): Promise<Alumni> => {
    return await apiClient.post<Alumni>('alumni/', data);
  },

  /**
   * Update alumni record
   */
  updateAlumni: async (studentId: string, data: Partial<Alumni>): Promise<Alumni> => {
    return await apiClient.patch<Alumni>(`alumni/${studentId}/`, data);
  },

  /**
   * Delete alumni record
   */
  deleteAlumni: async (studentId: string): Promise<void> => {
    return await apiClient.delete<void>(`alumni/${studentId}/`);
  },

  /**
   * Add career position to alumni
   */
  addCareerPosition: async (studentId: string, data: AddCareerPositionData): Promise<Alumni> => {
    return await apiClient.post<Alumni>(`alumni/${studentId}/add_career_position/`, data);
  },

  /**
   * Update support category
   */
  updateSupportCategory: async (studentId: string, data: UpdateSupportCategoryData): Promise<Alumni> => {
    return await apiClient.put<Alumni>(`alumni/${studentId}/update_support_category/`, data);
  },

  /**
   * Search alumni
   */
  searchAlumni: async (params: AlumniSearchParams): Promise<{ count: number; results: Alumni[] }> => {
    return await apiClient.get<{ count: number; results: Alumni[] }>('alumni/search/', params);
  },

  /**
   * Get alumni statistics
   */
  getAlumniStats: async (): Promise<AlumniStats> => {
    return await apiClient.get<AlumniStats>('alumni/stats/');
  },
};
