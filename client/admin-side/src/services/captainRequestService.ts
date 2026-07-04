/**
 * Captain Account Request Service
 * Requests created at captain signup are routed to the Department Head of the
 * matching department + shift, who approves or rejects them.
 */

import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface CaptainRequest {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile_number: string;
  student_id: string | null;
  department: string | null;
  department_name: string | null;
  shift: 'Morning' | 'Day';
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface CaptainRequestListParams {
  status?: 'pending' | 'approved' | 'rejected';
  department?: string;
  shift?: 'Morning' | 'Day';
}

export const captainRequestService = {
  /** List captain requests (Department Heads are auto-scoped server-side). */
  getRequests: async (params: CaptainRequestListParams = {}): Promise<{ count: number; results: CaptainRequest[] }> => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.department) query.set('department', params.department);
    if (params.shift) query.set('shift', params.shift);
    const qs = query.toString();
    return await apiClient.get(`${API_ENDPOINTS.captainRequests.list}${qs ? `?${qs}` : ''}`);
  },

  /** Approve or reject a captain request. */
  review: async (
    id: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<{ message: string; request: CaptainRequest }> => {
    return await apiClient.post(API_ENDPOINTS.captainRequests.review(id), {
      action,
      reason: reason || '',
    });
  },
};

export default captainRequestService;
