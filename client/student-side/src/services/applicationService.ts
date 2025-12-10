import api from '@/lib/api';

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
};

export default applicationService;
