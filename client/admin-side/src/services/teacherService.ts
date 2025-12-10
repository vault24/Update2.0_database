/**
 * Teacher Service
 * Handles all teacher-related API calls
 */

import { apiClient, PaginatedResponse } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

// Types
export interface Teacher {
  id: string;
  fullNameEnglish: string;
  fullNameBangla: string;
  designation: string;
  department: string;
  departmentName?: string;
  subjects?: string[];
  qualifications?: string[];
  specializations?: string[];
  email: string;
  mobileNumber: string;
  officeLocation?: string;
  profilePhoto?: string;
  employmentStatus: 'active' | 'inactive' | 'retired';
  joiningDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSignupRequest {
  id: string;
  full_name_english: string;
  full_name_bangla: string;
  email: string;
  mobile_number: string;
  designation: string;
  department: string;
  department_name?: string;
  qualifications?: string[];
  specializations?: string[];
  office_location?: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewed_by_username?: string;
  review_notes?: string;
  user?: any;
}

export interface TeacherFilters {
  department?: string;
  employmentStatus?: string;
  designation?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface TeacherRequestFilters {
  status?: string;
  department?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface TeacherCreateData {
  fullNameEnglish: string;
  fullNameBangla: string;
  designation: string;
  department: string;
  subjects?: string[];
  qualifications?: string[];
  specializations?: string[];
  email: string;
  mobileNumber: string;
  officeLocation?: string;
  employmentStatus?: string;
  joiningDate: string;
}

export interface TeacherUpdateData extends Partial<TeacherCreateData> {}

export interface TeacherApproveData {
  joining_date: string;
  subjects?: string[];
  review_notes?: string;
}

export interface TeacherRejectData {
  review_notes: string;
}

export interface TeacherStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

// Teacher Service
export const teacherService = {
  /**
   * Get list of teachers with filters and pagination
   */
  async getTeachers(filters?: TeacherFilters): Promise<PaginatedResponse<Teacher>> {
    return apiClient.get<PaginatedResponse<Teacher>>(
      API_ENDPOINTS.teachers.list,
      filters
    );
  },

  /**
   * Get teacher by ID
   */
  async getTeacher(id: string): Promise<Teacher> {
    return apiClient.get<Teacher>(API_ENDPOINTS.teachers.detail(id));
  },

  /**
   * Create new teacher
   */
  async createTeacher(data: TeacherCreateData): Promise<Teacher> {
    return apiClient.post<Teacher>(API_ENDPOINTS.teachers.list, data);
  },

  /**
   * Update teacher
   */
  async updateTeacher(id: string, data: TeacherUpdateData): Promise<Teacher> {
    return apiClient.put<Teacher>(API_ENDPOINTS.teachers.update(id), data);
  },

  /**
   * Delete teacher
   */
  async deleteTeacher(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.teachers.delete(id));
  },

  /**
   * Upload teacher photo
   */
  async uploadPhoto(id: string, photoFile: File): Promise<Teacher> {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return apiClient.post<Teacher>(
      API_ENDPOINTS.teachers.uploadPhoto(id),
      formData,
      true
    );
  },

  /**
   * Search teachers
   */
  async searchTeachers(query: string): Promise<Teacher[]> {
    return apiClient.get<Teacher[]>(`/teachers/search/`, { q: query });
  },

  // Teacher Requests
  /**
   * Get list of teacher signup requests
   */
  async getTeacherRequests(filters?: TeacherRequestFilters): Promise<PaginatedResponse<TeacherSignupRequest>> {
    return apiClient.get<PaginatedResponse<TeacherSignupRequest>>(
      API_ENDPOINTS.teachers.requests,
      filters
    );
  },

  /**
   * Get teacher request by ID
   */
  async getTeacherRequest(id: string): Promise<TeacherSignupRequest> {
    return apiClient.get<TeacherSignupRequest>(API_ENDPOINTS.teachers.requestDetail(id));
  },

  /**
   * Approve teacher signup request
   */
  async approveTeacherRequest(id: string, data: TeacherApproveData): Promise<{
    message: string;
    request: TeacherSignupRequest;
    teacher_id: string;
  }> {
    return apiClient.post(API_ENDPOINTS.teachers.approveRequest(id), data);
  },

  /**
   * Reject teacher signup request
   */
  async rejectTeacherRequest(id: string, data: TeacherRejectData): Promise<{
    message: string;
    request: TeacherSignupRequest;
  }> {
    return apiClient.post(API_ENDPOINTS.teachers.rejectRequest(id), data);
  },

  /**
   * Get teacher request statistics
   */
  async getTeacherRequestStats(): Promise<TeacherStats> {
    const response = await apiClient.get<PaginatedResponse<TeacherSignupRequest>>(
      API_ENDPOINTS.teachers.requests,
      { page_size: 1000 }
    );

    const stats: TeacherStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: response.count,
    };

    response.results.forEach((request) => {
      if (request.status === 'pending') stats.pending++;
      else if (request.status === 'approved') stats.approved++;
      else if (request.status === 'rejected') stats.rejected++;
    });

    return stats;
  },
};
