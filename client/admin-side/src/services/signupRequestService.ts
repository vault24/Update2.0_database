/**
 * Signup Request Service
 * Handles API calls for admin signup approval workflow
 */

import { apiClient } from '../lib/api';

export interface SignupRequest {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  requested_role: string;
  department?: string;
  department_name?: string | null;
  shift?: '' | '1st_shift' | '2nd_shift';
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface SignupRequestData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number?: string;
  requested_role: string;
  department?: string; // required when requested_role === 'department_head'
  shift?: '1st_shift' | '2nd_shift'; // required when requested_role === 'department_head'
  password: string;
  password_confirm: string;
  verification_code: string; // emailed OTP, required
}

export interface AvailabilityResponse {
  username?: string;
  username_available?: boolean;
  email?: string;
  email_available?: boolean;
}

export interface SignupRequestFilters {
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
  date_from?: string;
  date_to?: string;
  reviewed_by?: string;
  page?: number;
  page_size?: number;
}

export interface SignupRequestStatusResponse {
  status: 'pending' | 'approved' | 'rejected' | 'not_found';
  message: string;
  rejection_reason?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
  signup_requests?: T[]; // Backend returns this field
}

const signupRequestService = {
  /**
   * Create a new signup request
   */
  createSignupRequest: async (data: SignupRequestData): Promise<{ message: string }> => {
    return await apiClient.post('/auth/signup-request/', data);
  },

  /**
   * Live availability check for username and/or email (rejected requests never
   * block reuse). Pass either or both.
   */
  checkAvailability: async (params: { username?: string; email?: string }): Promise<AvailabilityResponse> => {
    return await apiClient.get('/auth/signup-request/availability/', params);
  },

  /**
   * Send an email verification code for a new signup request.
   */
  sendSignupCode: async (email: string, firstName?: string): Promise<{ message: string }> => {
    return await apiClient.post('/auth/signup-request/send-code/', {
      email,
      first_name: firstName || '',
    });
  },

  /**
   * Get list of signup requests with optional filtering
   */
  getSignupRequests: async (
    filters?: SignupRequestFilters
  ): Promise<PaginatedResponse<SignupRequest>> => {
    const params: Record<string, any> = {};
    
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;
    if (filters?.reviewed_by) params.reviewed_by = filters.reviewed_by;
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;

    return await apiClient.get('/auth/signup-requests/', params);
  },

  /**
   * Get a specific signup request by ID
   */
  getSignupRequestById: async (id: string): Promise<SignupRequest> => {
    return await apiClient.get(`/auth/signup-requests/${id}/`);
  },

  /**
   * Approve a pending signup request
   */
  approveSignupRequest: async (id: string): Promise<{ message: string; user_id: string }> => {
    return await apiClient.post(`/auth/signup-requests/${id}/approve/`);
  },

  /**
   * Reject a pending signup request
   */
  rejectSignupRequest: async (
    id: string,
    reason?: string
  ): Promise<{ message: string }> => {
    return await apiClient.post(`/auth/signup-requests/${id}/reject/`, {
      rejection_reason: reason || '',
    });
  },

  /**
   * Check the status of a signup request by username
   */
  checkSignupRequestStatus: async (username: string): Promise<SignupRequestStatusResponse> => {
    return await apiClient.get(`/auth/signup-request-status/${username}/`);
  },
};

export default signupRequestService;
