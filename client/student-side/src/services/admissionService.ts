/**
 * Admission Service
 * Handles admission application submission and status checking
 */

import api from '@/lib/api';

export interface AddressData {
  village: string;
  postOffice: string;
  upazila: string;
  district: string;
  division: string;
  policeStation?: string;
  municipality?: string;
  ward?: string;
  fullAddress?: string;
}

export interface AdmissionFormData {
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
  present_address: AddressData | string;
  permanent_address: AddressData | string;
  
  // Educational Background
  highest_exam: string;
  board: string;
  group: string;
  roll_number: string;
  registration_number: string;
  passing_year: string;
  gpa: string;
  institution_name: string;
  
  // Admission Details
  desired_department: string; // UUID
  desired_shift: string;
  session: string;
  
  // Documents (optional)
  documents?: any;
}

export interface Admission {
  id: string;
  full_name_english: string;
  full_name_bangla: string;
  email: string;
  mobile_student: string;
  status: 'pending' | 'approved' | 'rejected';
  desired_department: {
    id: string;
    name: string;
    code: string;
  };
  desired_shift: string;
  session: string;
  gpa: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: {
    id: string;
    username: string;
  };
  rejection_reason?: string;
  alreadySubmitted?: boolean;
}

export interface DraftData {
  id?: string;
  draft_data: any;
  current_step?: number;
  saved_at?: string;
}

export const DRAFT_STORAGE_KEY = 'admission_form_draft';

class AdmissionService {
  /**
   * Submit admission application
   * POST /api/admissions/
   */
  async submitApplication(data: AdmissionFormData): Promise<Admission> {
    const response = await api.post<any>('/admissions/', data);
    // Handle case where admission was already submitted
    if (response.admission) {
      return {
        ...response.admission,
        alreadySubmitted: true,
      };
    }
    return response;
  }

  /**
   * Submit admission application with documents
   * POST /api/admissions/ followed by POST /api/admissions/upload-documents/
   */
  async submitApplicationWithDocuments(
    data: AdmissionFormData, 
    documents: Record<string, File>
  ): Promise<Admission> {
    // First submit the admission application
    const admission = await this.submitApplication(data);
    
    // If admission was already submitted, return it
    if (admission.alreadySubmitted) {
      return admission;
    }
    
    // If there are documents to upload, upload them
    if (documents && Object.keys(documents).length > 0) {
      try {
        await this.uploadDocuments(admission.id, documents);
      } catch (error) {
        console.error('Document upload failed after admission submission:', error);
        // Don't fail the entire submission if documents fail
        // The admission is already created, just log the error
        throw new Error(
          'Admission submitted successfully, but document upload failed. ' +
          'Please try uploading documents again from your dashboard.'
        );
      }
    }
    
    return admission;
  }

  /**
   * Upload documents for an admission
   * POST /api/admissions/upload-documents/
   */
  async uploadDocuments(
    admissionId: string, 
    documents: Record<string, File>
  ): Promise<void> {
    const formData = new FormData();
    formData.append('admission_id', admissionId);
    
    // Add each document file to the form data
    Object.entries(documents).forEach(([fieldName, file]) => {
      if (file) {
        formData.append(`documents[${fieldName}]`, file);
      }
    });
    
    await api.post('/admissions/upload-documents/', formData, true);
  }

  /**
   * Get current user's admission status
   * GET /api/admissions/my_admission/
   */
  async getMyAdmission(): Promise<Admission> {
    // Note: backend uses underscore route name `my_admission`
    return await api.get<Admission>('/admissions/my_admission/');
  }

  /**
   * Get admission by ID
   * GET /api/admissions/{id}/
   */
  async getAdmissionById(id: string): Promise<Admission> {
    return await api.get<Admission>(`/admissions/${id}/`);
  }

  /**
   * Save draft to server with localStorage fallback
   * POST /api/admissions/save-draft/
   */
  async saveDraft(draftData: any, currentStep: number): Promise<DraftData> {
    const persistLocally = (data: any) => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        formData: data,
        currentStep,
        savedAt: new Date().toISOString()
      }));
    };

    try {
      const response = await api.post<DraftData>('/admissions/save-draft/', {
        draft_data: draftData,
        current_step: currentStep
      });
      // Keep a local backup even when server save succeeds
      persistLocally(draftData);
      return response;
    } catch (error) {
      console.error('Failed to save draft to server, using localStorage fallback:', error);
      // Fallback to localStorage only
      persistLocally(draftData);
      throw error; // Re-throw to let caller know server save failed
    }
  }

  /**
   * Get draft from server with localStorage fallback
   * GET /api/admissions/get-draft/
   */
  async getDraft(): Promise<DraftData | null> {
    const localFallback = (): DraftData | null => {
      const localData = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!localData) return null;
      const parsed = JSON.parse(localData);
      return {
        draft_data: parsed.formData,
        current_step: parsed.currentStep,
        saved_at: parsed.savedAt
      };
    };

    try {
      const response = await api.get<DraftData>('/admissions/get-draft/');
      // Cache server draft locally for offline resumes
      if (response?.draft_data) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
          formData: response.draft_data,
          currentStep: response.current_step,
          savedAt: response.saved_at || new Date().toISOString()
        }));
      }
      return response;
    } catch (error: any) {
      // Fall back to localStorage when server is unreachable or draft missing
      if (error?.response?.status === 404) {
        return localFallback();
      }
      const offlineDraft = localFallback();
      if (offlineDraft) {
        return offlineDraft;
      }
      throw error;
    }
  }

  /**
   * Clear draft from both server and localStorage
   * DELETE /api/admissions/clear-draft/
   */
  async clearDraft(): Promise<void> {
    try {
      await api.delete('/admissions/clear-draft/');
    } catch (error) {
      console.error('Failed to clear draft from server:', error);
    }
    // Always clear localStorage regardless of server response
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  /**
   * Check if user has existing admission
   */
  async checkExistingAdmission(): Promise<{
    hasAdmission: boolean;
    admissionId?: string;
    status?: string;
  }> {
    try {
      const admission = await this.getMyAdmission();
      return {
        hasAdmission: true,
        admissionId: admission.id,
        status: admission.status
      };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return { hasAdmission: false };
      }
      throw error;
    }
  }
}

export const admissionService = new AdmissionService();
export default admissionService;
