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
}

export interface MyDocumentsResponse {
  count: number;
  documents: Document[];
}

// Service
export const documentService = {
  /**
   * Get documents for a specific student
   */
  getMyDocuments: async (studentId: string, category?: DocumentCategory): Promise<MyDocumentsResponse> => {
    const params: any = { student: studentId };
    if (category) {
      params.category = category;
    }
    return await apiClient.get<MyDocumentsResponse>('documents/my-documents/', params);
  },

  /**
   * Download document
   */
  downloadDocument: async (id: string): Promise<Blob> => {
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
      throw new Error('Failed to download document');
    }

    return await response.blob();
  },
};

