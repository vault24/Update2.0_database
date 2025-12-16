/**
 * Document Service
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
  source_type?: 'admission' | 'manual';
  source_id?: string;
  original_field_name?: string;
}

export interface DocumentFilters {
  page?: number;
  page_size?: number;
  student?: string;
  category?: DocumentCategory;
  source_type?: 'admission' | 'manual';
  ordering?: string;
}

export interface DocumentUploadData {
  student: string;
  category: DocumentCategory;
  file: File;
}

export interface MyDocumentsResponse {
  count: number;
  documents: Document[];
}

// Service
export const documentService = {
  /**
   * Get paginated list of documents
   */
  getDocuments: async (filters?: DocumentFilters): Promise<PaginatedResponse<Document>> => {
    return await apiClient.get<PaginatedResponse<Document>>('documents/', filters);
  },

  /**
   * Get single document by ID
   */
  getDocument: async (id: string): Promise<Document> => {
    return await apiClient.get<Document>(`documents/${id}/`);
  },

  /**
   * Upload document
   */
  uploadDocument: async (data: DocumentUploadData): Promise<Document> => {
    const formData = new FormData();
    formData.append('student', data.student);
    formData.append('category', data.category);
    formData.append('file', data.file);

    return await apiClient.post<Document>('documents/', formData, true);
  },

  /**
   * Delete document
   */
  deleteDocument: async (id: string): Promise<void> => {
    return await apiClient.delete<void>(`documents/${id}/`);
  },

  /**
   * Download document
   */
  downloadDocument: async (id: string): Promise<Blob> => {
    const response = await fetch(
      `${apiClient['baseURL']}/documents/${id}/download/`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return await response.blob();
  },

  /**
   * Get documents for a specific student
   */
  getMyDocuments: async (studentId: string, category?: DocumentCategory): Promise<MyDocumentsResponse> => {
    const params: any = { student: studentId };
    if (category) {
      params.category = category;
    }
    return await apiClient.get<MyDocumentsResponse>('documents/my_documents/', params);
  },
};
