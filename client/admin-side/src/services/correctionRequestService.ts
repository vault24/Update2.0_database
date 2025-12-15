/**
 * Correction Request Service
 * Handles API requests for student data correction requests
 */

import { apiClient } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/api';

// Types
export interface CorrectionRequest {
  id: string;
  student: {
    id: string;
    full_name_english: string;
    roll_number: string;
  };
  requested_by: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    account_status: string;
    admission_status: string;
    related_profile_id: string | null;
    mobile_number: string;
    created_at: string;
    updated_at: string;
  } | string;
  field_name: string;
  current_value: string;
  requested_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    account_status: string;
    admission_status: string;
    related_profile_id: string | null;
    mobile_number: string;
    created_at: string;
    updated_at: string;
  } | string;
  review_notes?: string;
}

class CorrectionRequestService {
  private baseURL = '/correction-requests';

  /**
   * Get all correction requests
   */
  async getCorrectionRequests(params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<CorrectionRequest>> {
    return await apiClient.get<PaginatedResponse<CorrectionRequest>>(
      `${this.baseURL}/`,
      params
    );
  }

  /**
   * Get correction request by ID
   */
  async getCorrectionRequest(id: string): Promise<CorrectionRequest> {
    return await apiClient.get<CorrectionRequest>(`${this.baseURL}/${id}/`);
  }

  /**
   * Approve correction request
   */
  async approveCorrectionRequest(
    id: string,
    reviewNotes?: string
  ): Promise<CorrectionRequest> {
    return await apiClient.post<CorrectionRequest>(
      `${this.baseURL}/${id}/approve/`,
      { review_notes: reviewNotes }
    );
  }

  /**
   * Reject correction request
   */
  async rejectCorrectionRequest(
    id: string,
    reviewNotes: string
  ): Promise<CorrectionRequest> {
    return await apiClient.post<CorrectionRequest>(
      `${this.baseURL}/${id}/reject/`,
      { review_notes: reviewNotes }
    );
  }

  /**
   * Get correction request statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    return await apiClient.get(`${this.baseURL}/stats/`);
  }
}

const correctionRequestService = new CorrectionRequestService();
export default correctionRequestService;
