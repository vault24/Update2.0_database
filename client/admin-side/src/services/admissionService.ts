/**
 * Admission Service
 * Handles all admission-related API calls
 */

import { apiClient, PaginatedResponse } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

// Types
export interface Admission {
  id: string;
  // Personal Information
  full_name_bangla: string;
  full_name_english: string;
  father_name: string;
  father_nid: string;
  mother_name: string;
  mother_nid: string;
  date_of_birth: string;
  birth_certificate_no: string;
  gender: string;
  religion: string;
  blood_group: string;
  
  // Contact Information
  mobile_student: string;
  guardian_mobile: string;
  email: string;
  emergency_contact: string;
  present_address: Address;
  permanent_address: Address;
  
  // Educational Background
  highest_exam: string;
  board: string;
  group: string;
  roll_number: string;
  registration_number: string;
  passing_year: number;
  gpa: number;
  institution_name: string;
  
  // Admission Details
  desired_department: string;
  department_name?: string;
  desired_shift: string;
  session: string;
  
  // Documents
  documents?: Record<string, string> | null;
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewed_by_username?: string;
  review_notes?: string;
  
  // User info
  user?: any;
  user_email?: string;
}

export interface Address {
  village: string;
  postOffice: string;
  upazila: string;
  district: string;
  division: string;
}

export interface AdmissionFilters {
  status?: string;
  desired_department?: string;
  desired_shift?: string;
  session?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface AdmissionCreateData {
  full_name_bangla: string;
  full_name_english: string;
  father_name: string;
  father_nid: string;
  mother_name: string;
  mother_nid: string;
  date_of_birth: string;
  birth_certificate_no: string;
  gender: string;
  religion: string;
  blood_group: string;
  mobile_student: string;
  guardian_mobile: string;
  email: string;
  emergency_contact: string;
  present_address: Address;
  permanent_address: Address;
  highest_exam: string;
  board: string;
  group: string;
  roll_number: string;
  registration_number: string;
  passing_year: number;
  gpa: number;
  institution_name: string;
  desired_department: string;
  desired_shift: string;
  session: string;
  documents?: Record<string, string>;
}

export interface AdmissionApproveData {
  current_roll_number: string;
  current_registration_number: string;
  semester: number;
  current_group: string;
  enrollment_date: string;
  review_notes?: string;
}

export interface AdmissionRejectData {
  review_notes: string;
}

export interface AdmissionStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

// Admission Service
export const admissionService = {
  /**
   * Get list of admissions with filters and pagination
   */
  async getAdmissions(filters?: AdmissionFilters): Promise<PaginatedResponse<Admission>> {
    return apiClient.get<PaginatedResponse<Admission>>(
      API_ENDPOINTS.admissions.list,
      filters
    );
  },

  /**
   * Get admission by ID
   */
  async getAdmission(id: string): Promise<Admission> {
    return apiClient.get<Admission>(API_ENDPOINTS.admissions.detail(id));
  },

  /**
   * Create new admission (student/captain only)
   */
  async createAdmission(data: AdmissionCreateData): Promise<Admission> {
    return apiClient.post<Admission>(API_ENDPOINTS.admissions.create, data);
  },

  /**
   * Get current user's admission
   */
  async getMyAdmission(): Promise<Admission> {
    return apiClient.get<Admission>(API_ENDPOINTS.admissions.myAdmission);
  },

  /**
   * Approve admission and create student profile
   */
  async approveAdmission(id: string, data: AdmissionApproveData): Promise<{
    message: string;
    admission: Admission;
    student_id: string;
  }> {
    return apiClient.post(API_ENDPOINTS.admissions.approve(id), data);
  },

  /**
   * Reject admission
   */
  async rejectAdmission(id: string, data: AdmissionRejectData): Promise<{
    message: string;
    admission: Admission;
  }> {
    return apiClient.post(API_ENDPOINTS.admissions.reject(id), data);
  },

  /**
   * Get admission statistics
   * This is a client-side calculation from the list
   */
  async getAdmissionStats(): Promise<AdmissionStats> {
    // Fetch all admissions without pagination to get accurate counts
    const response = await apiClient.get<PaginatedResponse<Admission>>(
      API_ENDPOINTS.admissions.list,
      { page_size: 1000 } // Large page size to get all
    );

    const stats: AdmissionStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: response.count,
    };

    response.results.forEach((admission) => {
      if (admission.status === 'pending') stats.pending++;
      else if (admission.status === 'approved') stats.approved++;
      else if (admission.status === 'rejected') stats.rejected++;
    });

    return stats;
  },
};
