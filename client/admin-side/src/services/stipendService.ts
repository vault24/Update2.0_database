/**
 * Stipend Service
 * Handles all stipend-related API calls
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export interface StipendCriteria {
  id: string;
  name: string;
  description: string;
  minAttendance: number;
  minGpa: number;
  passRequirement: 'all_pass' | '1_referred' | '2_referred' | 'any';
  department?: string;
  departmentName?: string;
  semester?: number;
  shift?: string;
  session?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
}

export interface EligibleStudent {
  id: string;
  name: string;
  nameBangla?: string;
  roll: string;
  department: string;
  semester: number;
  session: string;
  shift: string;
  photo?: string;
  attendance: number;
  gpa: number;
  cgpa: number;
  referredSubjects: number;
  totalSubjects: number;
  passedSubjects: number;
  rank?: number;
}

export interface StipendEligibility {
  id: string;
  student: string;
  studentName: string;
  studentRoll: string;
  criteria: string;
  criteriaName: string;
  attendance: number;
  gpa: number;
  cgpa: number;
  referredSubjects: number;
  totalSubjects: number;
  passedSubjects: number;
  rank?: number;
  isEligible: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EligibilityCalculationParams {
  minAttendance?: number;
  minGpa?: number;
  passRequirement?: string;
  department?: string;
  semester?: string;
  shift?: string;
  session?: string;
  search?: string;
}

export interface EligibilityCalculationResponse {
  students: EligibleStudent[];
  statistics: {
    totalEligible: number;
    avgAttendance: number;
    avgGpa: number;
    allPassCount: number;
    referredCount: number;
  };
  criteria: {
    minAttendance: number;
    minGpa: number;
    passRequirement: string;
  };
}

export interface SaveEligibilityData {
  criteriaId: string;
  studentIds: string[];
}

export interface BulkApproveData {
  ids: string[];
}

// Stipend Service
export const stipendService = {
  /**
   * Get list of stipend criteria
   */
  async getCriteria(filters?: { isActive?: boolean }): Promise<StipendCriteria[]> {
    return apiClient.get<StipendCriteria[]>('/stipends/criteria/', filters);
  },

  /**
   * Get active criteria
   */
  async getActiveCriteria(): Promise<StipendCriteria[]> {
    return apiClient.get<StipendCriteria[]>('/stipends/criteria/active/');
  },

  /**
   * Get criteria by ID
   */
  async getCriteriaById(id: string): Promise<StipendCriteria> {
    return apiClient.get<StipendCriteria>(`/stipends/criteria/${id}/`);
  },

  /**
   * Create new criteria
   */
  async createCriteria(data: Partial<StipendCriteria>): Promise<StipendCriteria> {
    return apiClient.post<StipendCriteria>('/stipends/criteria/', data);
  },

  /**
   * Update criteria
   */
  async updateCriteria(id: string, data: Partial<StipendCriteria>): Promise<StipendCriteria> {
    return apiClient.put<StipendCriteria>(`/stipends/criteria/${id}/`, data);
  },

  /**
   * Delete criteria
   */
  async deleteCriteria(id: string): Promise<void> {
    return apiClient.delete<void>(`/stipends/criteria/${id}/`);
  },

  /**
   * Calculate eligible students based on criteria
   */
  async calculateEligibility(params: EligibilityCalculationParams): Promise<EligibilityCalculationResponse> {
    return apiClient.get<EligibilityCalculationResponse>(
      '/stipends/eligibility/calculate/',
      params
    );
  },

  /**
   * Save eligibility records
   */
  async saveEligibility(data: SaveEligibilityData): Promise<{
    message: string;
    created: number;
    updated: number;
  }> {
    return apiClient.post('/stipends/eligibility/save_eligibility/', data);
  },

  /**
   * Get eligibility records
   */
  async getEligibility(filters?: {
    criteria?: string;
    is_approved?: boolean;
  }): Promise<StipendEligibility[]> {
    return apiClient.get<StipendEligibility[]>('/stipends/eligibility/', filters);
  },

  /**
   * Get eligibility by ID
   */
  async getEligibilityById(id: string): Promise<StipendEligibility> {
    return apiClient.get<StipendEligibility>(`/stipends/eligibility/${id}/`);
  },

  /**
   * Approve eligibility
   */
  async approveEligibility(id: string): Promise<StipendEligibility> {
    return apiClient.post<StipendEligibility>(`/stipends/eligibility/${id}/approve/`);
  },

  /**
   * Unapprove eligibility
   */
  async unapproveEligibility(id: string): Promise<StipendEligibility> {
    return apiClient.post<StipendEligibility>(`/stipends/eligibility/${id}/unapprove/`);
  },

  /**
   * Bulk approve eligibilities
   */
  async bulkApprove(data: BulkApproveData): Promise<{
    message: string;
    count: number;
  }> {
    return apiClient.post('/stipends/eligibility/bulk_approve/', data);
  },

  /**
   * Update eligibility
   */
  async updateEligibility(id: string, data: Partial<StipendEligibility>): Promise<StipendEligibility> {
    return apiClient.put<StipendEligibility>(`/stipends/eligibility/${id}/`, data);
  },

  /**
   * Delete eligibility
   */
  async deleteEligibility(id: string): Promise<void> {
    return apiClient.delete<void>(`/stipends/eligibility/${id}/`);
  },
};
