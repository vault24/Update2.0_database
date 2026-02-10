/**
 * Document Service
 * Handles API requests for document management with enhanced file storage
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
  | 'Medical Certificate'
  | 'Quota Document'
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
  file_size_mb: number;
  fileHash: string;
  mimeType: string;
  uploadDate: string;
  lastModified: string;
  status: 'active' | 'deleted' | 'corrupted';
  source_type?: 'admission' | 'manual' | 'system';
  source_type_display?: string;
  source_id?: string;
  original_field_name?: string;
  is_public: boolean;
  description?: string;
  tags?: string[];
  file_url: string;
  is_image: boolean;
  is_pdf: boolean;
}

export interface DocumentFilters {
  page?: number;
  page_size?: number;
  student?: string;
  category?: DocumentCategory;
  source_type?: 'admission' | 'manual' | 'system';
  source_id?: string;
  status?: 'active' | 'deleted' | 'corrupted';
  is_public?: boolean;
  ordering?: string;
  search?: string;
}

export interface DocumentUploadData {
  student?: string;
  category: DocumentCategory;
  file: File;
  source_type?: 'admission' | 'manual' | 'system';
  source_id?: string;
  original_field_name?: string;
  description?: string;
  tags?: string[];
  is_public?: boolean;
  custom_filename?: string;
}

export interface BatchDocumentUploadData {
  student?: string;
  source_type?: 'admission' | 'manual' | 'system';
  source_id?: string;
  documents: Array<{
    file: File;
    category: DocumentCategory;
    original_field_name?: string;
    description?: string;
    tags?: string[];
    is_public?: boolean;
    metadata?: Record<string, any>;
  }>;
}

export interface MyDocumentsResponse {
  count: number;
  documents: Document[];
}

export interface DocumentIntegrityStatus {
  document_id: string;
  file_name: string;
  file_path: string;
  exists: boolean;
  accessible: boolean;
  size_match: boolean;
  hash_match?: boolean;
  expected_size: number;
  actual_size?: number;
  expected_hash?: string;
  status: 'healthy' | 'missing' | 'corrupted' | 'size_mismatch' | 'hash_mismatch' | 'warning' | 'error';
  errors: string[];
  warnings?: string[];
  integrity_message?: string;
}

export interface StorageStats {
  storage: {
    total_files: number;
    total_size_mb: number;
    storage_root: string;
    storage_url: string;
  };
  database: {
    total_documents: number;
    active_documents: number;
    deleted_documents: number;
    corrupted_documents: number;
  };
  timestamp: string;
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
   * Upload single document
   */
  uploadDocument: async (data: DocumentUploadData): Promise<Document> => {
    const formData = new FormData();
    
    if (data.student) formData.append('student', data.student);
    formData.append('category', data.category);
    formData.append('file', data.file);
    
    if (data.source_type) formData.append('source_type', data.source_type);
    if (data.source_id) formData.append('source_id', data.source_id);
    if (data.original_field_name) formData.append('original_field_name', data.original_field_name);
    if (data.description) formData.append('description', data.description);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    if (data.is_public !== undefined) formData.append('is_public', data.is_public.toString());
    if (data.custom_filename) formData.append('custom_filename', data.custom_filename);

    return await apiClient.post<Document>('documents/', formData, true);
  },

  /**
   * Upload multiple documents in batch
   */
  batchUploadDocuments: async (data: BatchDocumentUploadData): Promise<{
    success: number;
    errors?: number;
    error_details?: string[];
    documents: Document[];
  }> => {
    const formData = new FormData();
    
    if (data.student) formData.append('student', data.student);
    if (data.source_type) formData.append('source_type', data.source_type);
    if (data.source_id) formData.append('source_id', data.source_id);
    
    // Add documents array
    data.documents.forEach((doc, index) => {
      formData.append(`documents[${index}][file]`, doc.file);
      formData.append(`documents[${index}][category]`, doc.category);
      if (doc.original_field_name) formData.append(`documents[${index}][original_field_name]`, doc.original_field_name);
      if (doc.description) formData.append(`documents[${index}][description]`, doc.description);
      if (doc.tags) formData.append(`documents[${index}][tags]`, JSON.stringify(doc.tags));
      if (doc.is_public !== undefined) formData.append(`documents[${index}][is_public]`, doc.is_public.toString());
      if (doc.metadata) formData.append(`documents[${index}][metadata]`, JSON.stringify(doc.metadata));
    });

    return await apiClient.post('documents/batch-upload/', formData, true);
  },

  /**
   * Delete document
   */
  deleteDocument: async (id: string): Promise<{ message: string; file_deleted: boolean }> => {
    return await apiClient.delete(`documents/${id}/`);
  },

  /**
   * Get document preview URL
   */
  getDocumentPreviewUrl: (id: string): string => {
    return `${apiClient['baseURL']}/documents/${id}/preview/`;
  },

  /**
   * Get secure file URL for viewing
   */
  getSecureFileUrl: (filePath: string): string => {
    return `${apiClient['baseURL']}/files/${filePath}`;
  },

  /**
   * Preview document (view in browser)
   */
  previewDocument: async (id: string): Promise<Blob> => {
    const response = await fetch(
      `${apiClient['baseURL']}/documents/${id}/preview/`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to preview document');
    }

    return await response.blob();
  },
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
   * Check document integrity
   */
  checkDocumentIntegrity: async (id: string): Promise<DocumentIntegrityStatus> => {
    return await apiClient.get<DocumentIntegrityStatus>(`documents/${id}/integrity-check/`);
  },

  /**
   * Check integrity of multiple documents
   */
  batchCheckIntegrity: async (documentIds: string[]): Promise<{
    summary: {
      total_checked: number;
      healthy: number;
      missing: number;
      corrupted: number;
      warnings: number;
      errors: number;
    };
    results: DocumentIntegrityStatus[];
  }> => {
    return await apiClient.post('documents/batch-integrity-check/', {
      document_ids: documentIds
    });
  },

  /**
   * Get storage statistics (admin only)
   */
  getStorageStats: async (): Promise<StorageStats> => {
    return await apiClient.get<StorageStats>('documents/storage-stats/');
  },

  /**
   * Clean up orphaned files (admin only)
   */
  cleanupOrphanedFiles: async (): Promise<{
    message: string;
    stats: {
      deleted_count: number;
      deleted_size_bytes: number;
      deleted_size_mb: number;
    };
  }> => {
    return await apiClient.post('documents/cleanup-orphaned/');
  },

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
   * Upload admission documents
   */
  uploadAdmissionDocuments: async (admissionId: string, documents: Record<string, File>): Promise<{
    message: string;
    documents_processed: boolean;
    admission?: any;
  }> => {
    const formData = new FormData();
    formData.append('admission_id', admissionId);
    
    Object.entries(documents).forEach(([fieldName, file]) => {
      formData.append(`documents[${fieldName}]`, file);
    });

    return await apiClient.post('admissions/upload-documents/', formData, true);
  },
};
