import { apiClient } from '@/lib/api';
import { API_BASE_URL } from '@/config/api';

export interface ApplicationApproval {
  id: string;
  action: 'approved' | 'forwarded' | 'rejected';
  approver_role: string;
  approver_role_label: string;
  approver_name: string;
  notes?: string;
  forwarded_to_role?: string;
  forwarded_to_name?: string;
  signature_url?: string | null;
  order: number;
  created_at: string;
}

export interface Application {
  id: string;
  fullNameBangla: string;
  fullNameEnglish: string;
  fatherName: string;
  motherName: string;
  department: string;
  session: string;
  shift: string;
  rollNumber: string;
  registrationNumber: string;
  email?: string;
  applicationType: string;
  subject: string;
  message: string;
  selectedDocuments?: string[];
  status: 'pending' | 'approved' | 'rejected';
  // Workflow
  template?: string | null;
  template_name?: string | null;
  template_slug?: string | null;
  current_approver_role?: string;
  current_approver_label?: string;
  current_holder?: string;
  current_department?: string | null;
  current_department_name?: string | null;
  stage?: number;
  approvals?: ApplicationApproval[];
  can_download?: boolean;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface ApplicationFilters {
  status?: string;
  applicationType?: string;
  department?: string;
  search?: string;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const applicationService = {
  // Get all applications with optional filters
  async getApplications(filters?: ApplicationFilters): Promise<{ results: Application[]; count: number }> {
    const params: Record<string, any> = {};
    
    if (filters?.status && filters.status !== 'All Status') {
      params.status = filters.status.toLowerCase();
    }
    if (filters?.applicationType && filters.applicationType !== 'All Types') {
      params.applicationType = filters.applicationType;
    }
    if (filters?.department) {
      params.department = filters.department;
    }
    
    return apiClient.get('/applications/', params);
  },

  // Get single application by ID
  async getApplication(id: string): Promise<Application> {
    return apiClient.get(`/applications/${id}/`);
  },

  // Approve application
  async approveApplication(id: string, reviewedBy: string, reviewNotes?: string): Promise<Application> {
    return apiClient.post(`/applications/${id}/approve/`, {
      reviewedBy,
      reviewNotes: reviewNotes || '',
    });
  },

  // Forward application for a second approval (Principal default, or a Department Head)
  async forwardApplication(
    id: string,
    forwardTo: 'institute_head' | 'department_head',
    options?: { departmentId?: string; reviewNotes?: string }
  ): Promise<Application> {
    return apiClient.post(`/applications/${id}/forward/`, {
      forward_to: forwardTo,
      department_id: options?.departmentId,
      reviewNotes: options?.reviewNotes || '',
    });
  },

  // Reject application
  async rejectApplication(id: string, reviewedBy: string, reviewNotes: string): Promise<Application> {
    return apiClient.post(`/applications/${id}/reject/`, {
      reviewedBy,
      reviewNotes,
    });
  },

  // URL of the rendered, signed document (open in a new tab to view / print)
  getDocumentUrl(id: string): string {
    return `${API_BASE_URL}/applications/${id}/document/`;
  },

  // Get application statistics
  async getStats(): Promise<ApplicationStats> {
    const response = await apiClient.get<{ results: Application[]; count: number }>('/applications/');
    const applications = response.results || [];
    
    return {
      total: applications.length,
      pending: applications.filter((a: Application) => a.status === 'pending').length,
      approved: applications.filter((a: Application) => a.status === 'approved').length,
      rejected: applications.filter((a: Application) => a.status === 'rejected').length,
    };
  },

  // Export applications report
  async exportReport(filters?: ApplicationFilters): Promise<Blob> {
    const params: Record<string, any> = {};
    
    if (filters?.status && filters.status !== 'All Status') {
      params.status = filters.status.toLowerCase();
    }
    if (filters?.applicationType && filters.applicationType !== 'All Types') {
      params.applicationType = filters.applicationType;
    }
    
    // Note: Blob response handling may need adjustment based on backend implementation
    return apiClient.get(`/applications/`, params) as Promise<Blob>;
  },
};

export default applicationService;
