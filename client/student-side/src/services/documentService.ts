/**
 * Document Service (Student-side)
 * Handles API requests for document management
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export type DocumentCategory = 
  | 'NID'
  | 'Birth Certificate'
  | 'Marksheet'
  | 'Certificate'
  | 'Testimonial'
  | 'Photo'
  | 'Other';

export interface Document {
  id: string;
  student: string;
  studentName?: string;
  studentRoll?: string;
  fileName: string;
  fileType: string;
  category: DocumentCategory;
  filePath: string;
  fileSize: number;
  uploadDate: string;
  file_url?: string;
  source_type?: 'admission' | 'manual' | 'system';
  source_id?: string;
  original_field_name?: string;
}

export interface MyDocumentsResponse {
  count: number;
  documents: Document[];
}

export interface DocumentFilters {
  page?: number;
  page_size?: number;
  student?: string;
  category?: DocumentCategory;
  source_type?: 'admission' | 'manual' | 'system';
  source_id?: string;
}

// Service
export const documentService = {
  /**
   * Get documents with filters
   */
  getDocuments: async (filters?: DocumentFilters): Promise<PaginatedResponse<Document>> => {
    return await apiClient.get<PaginatedResponse<Document>>('documents/', filters);
  },
  /**
   * Get documents for a specific student (public access)
   */
  getStudentDocuments: async (studentId: string, category?: DocumentCategory): Promise<Document[]> => {
    try {
      const params: any = { student: studentId };
      if (category) {
        params.category = category;
      }
      
      const response = await apiClient.get<PaginatedResponse<Document>>('documents/', params);
      return response.results || [];
    } catch (error: any) {
      console.error('Public document fetch error:', error);
      
      // Return empty array if no documents found or access denied
      return [];
    }
  },

  /**
   * Get documents for a specific student
   */
  getMyDocuments: async (studentId: string, category?: DocumentCategory): Promise<MyDocumentsResponse> => {
    // Real API call
    try {
      const params: any = { student: studentId };
      if (category) {
        params.category = category;
      }
      
      // First ensure we have a valid session
      try {
        await apiClient.get('auth/csrf/');
      } catch (csrfError) {
        console.warn('CSRF token fetch failed:', csrfError);
      }
      
      return await apiClient.get<MyDocumentsResponse>('documents/my-documents/', params);
    } catch (error: any) {
      console.error('Document fetch error:', error);
      
      // If authentication fails, provide helpful error message
      if (error.status_code === 401 || error.error?.includes('Authentication required')) {
        throw {
          error: 'Authentication required',
          details: 'Please log in to access your documents.',
          status_code: 401,
        };
      }
      
      // If endpoint not found, it might be a server issue
      if (error.status_code === 404) {
        throw {
          error: 'Service unavailable',
          details: 'The document service is currently unavailable. Please try again later or contact support.',
          status_code: 404,
        };
      }
      
      // If no documents found, return empty result instead of error
      if (error.error?.includes('not found')) {
        return {
          count: 0,
          documents: [],
        };
      }
      
      throw error;
    }
  },

  /**
   * Download document
   */
  downloadDocument: async (id: string): Promise<Blob> => {
    // Real API call
    const { API_BASE_URL } = await import('@/config/api');
    const url = `${API_BASE_URL}/documents/${id}/download/`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-CSRFToken': document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1] || '',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in.');
      }
      throw new Error('Failed to download document');
    }

    return await response.blob();
  },

  /**
   * Get document preview URL
   */
  getDocumentPreviewUrl: (id: string): string => {
    // Real API URL
    return `http://localhost:8000/api/documents/${id}/preview/`;
  },

  /**
   * Preview document (for inline viewing)
   */
  previewDocument: async (id: string): Promise<Blob> => {
    // Real API call
    const { API_BASE_URL } = await import('@/config/api');
    const url = `${API_BASE_URL}/documents/${id}/preview/`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-CSRFToken': document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1] || '',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in.');
      }
      throw new Error('Failed to preview document');
    }

    return await response.blob();
  },

  /**
   * Set document as profile picture (for Photo category documents)
   */
  setAsProfilePicture: async (documentId: string, studentId?: string): Promise<void> => {
    // Persist to server so it works across devices
    const payload: Record<string, string> = {};
    if (studentId) {
      payload.student_id = studentId;
    }
    await apiClient.post(`documents/${documentId}/set-profile-photo/`, payload);
  },

  /**
   * Get profile picture URL
   */
  getProfilePictureUrl: (documentId?: string, studentId?: string): string | null => {
    if (!documentId) return null;
    
    return documentService.getDocumentPreviewUrl(documentId);
  },
};

