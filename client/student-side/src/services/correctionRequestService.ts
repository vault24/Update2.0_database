/**
 * Correction Request Service
 * Handles API requests for student data correction requests
 */

import { apiClient } from '@/lib/api';

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
    name: string;
    role: string;
  };
  field_name: string;
  current_value: string;
  requested_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface CreateCorrectionRequestData {
  student: string; // student ID
  field_name: string;
  current_value: string;
  requested_value: string;
  reason: string;
  supporting_documents?: string[];
}

class CorrectionRequestService {
  private baseURL = '/correction-requests';

  /**
   * Create a new correction request
   */
  async createCorrectionRequest(data: CreateCorrectionRequestData): Promise<CorrectionRequest> {
    return await apiClient.post<CorrectionRequest>(`${this.baseURL}/`, data);
  }

  /**
   * Get correction request by ID
   */
  async getCorrectionRequest(id: string): Promise<CorrectionRequest> {
    return await apiClient.get<CorrectionRequest>(`${this.baseURL}/${id}/`);
  }
}

const correctionRequestService = new CorrectionRequestService();
export default correctionRequestService;




