import api from '@/lib/api';
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
  order: number;
  created_at: string;
}

export interface DocumentTemplateOption {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
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
  template_name?: string | null;
  template_slug?: string | null;
  current_approver_role?: string;
  current_approver_label?: string;
  current_holder?: string;
  current_department_name?: string | null;
  stage?: number;
  approvals?: ApplicationApproval[];
  can_download?: boolean;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface ApplicationSubmitData {
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
  // Workflow routing
  template?: string;
  initial_assignee?: 'registrar' | 'institute_head' | 'department_head';
  department_id?: string;
}

const applicationService = {
  // Submit new application
  async submitApplication(data: ApplicationSubmitData): Promise<Application> {
    const response = await api.post<Application>('/applications/submit/', data);
    return response;
  },

  // Get student's own applications
  async getMyApplications(rollNumber: string, registrationNumber?: string): Promise<Application[]> {
    const params = new URLSearchParams();
    params.append('rollNumber', rollNumber);
    if (registrationNumber) {
      params.append('registrationNumber', registrationNumber);
    }
    
    const response = await api.get<{ count: number; applications: Application[] }>(`/applications/my-applications/?${params.toString()}`);
    return response.applications || [];
  },

  // Get single application by ID
  async getApplication(id: string): Promise<Application> {
    const response = await api.get<Application>(`/applications/${id}/`);
    return response;
  },

  // Document templates a student may apply for
  async getAvailableTemplates(): Promise<DocumentTemplateOption[]> {
    return api.get<DocumentTemplateOption[]>('/document-templates/available/');
  },

  // URL of the final signed document (open to view / print, with the student's roll for access)
  getDocumentUrl(id: string, rollNumber: string): string {
    return `${API_BASE_URL}/applications/${id}/document/?rollNumber=${encodeURIComponent(rollNumber)}`;
  },

  // Fetch the final document as a Blob for a real file download. The document
  // endpoint renders HTML; `window.open` only *views* it (and is blocked by
  // popup blockers on mobile), so downloads go through an authenticated fetch
  // + anchor instead. `download=1` asks the server for an attachment filename.
  async downloadDocumentBlob(id: string, rollNumber: string): Promise<Blob> {
    const url =
      `${API_BASE_URL}/applications/${id}/document/` +
      `?rollNumber=${encodeURIComponent(rollNumber)}&download=1`;
    const csrf = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('csrftoken='))
      ?.split('=')[1] || '';
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-CSRFToken': csrf },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Authentication required. Please log in.');
      }
      throw new Error('Failed to download document');
    }
    return res.blob();
  },
};

export default applicationService;
