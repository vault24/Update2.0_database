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

// Demo documents for testing
const demoDocuments: Document[] = [
  {
    id: 'demo-doc-1',
    student: 'demo-student-001',
    studentName: 'Rakib Ahmed',
    studentRoll: 'SPI-2024-0001',
    fileName: 'Academic_Transcript.pdf',
    fileType: 'pdf',
    category: 'Certificate',
    filePath: '/demo/academic_transcript.pdf',
    fileSize: 245760,
    uploadDate: '2024-01-15T10:30:00Z',
  },
  {
    id: 'demo-doc-2',
    student: 'demo-student-001',
    studentName: 'Rakib Ahmed',
    studentRoll: 'SPI-2024-0001',
    fileName: 'Birth_Certificate.jpg',
    fileType: 'jpg',
    category: 'Birth Certificate',
    filePath: '/demo/birth_certificate.jpg',
    fileSize: 156432,
    uploadDate: '2024-01-15T10:35:00Z',
  },
  {
    id: 'demo-doc-3',
    student: 'demo-student-001',
    studentName: 'Rakib Ahmed',
    studentRoll: 'SPI-2024-0001',
    fileName: 'NID_Card.jpg',
    fileType: 'jpg',
    category: 'NID',
    filePath: '/demo/nid_card.jpg',
    fileSize: 198765,
    uploadDate: '2024-01-15T10:40:00Z',
  },
  {
    id: 'demo-doc-4',
    student: 'demo-student-001',
    studentName: 'Rakib Ahmed',
    studentRoll: 'SPI-2024-0001',
    fileName: 'Profile_Photo.jpg',
    fileType: 'jpg',
    category: 'Photo',
    filePath: '/demo/profile_photo.jpg',
    fileSize: 89432,
    uploadDate: '2024-01-15T10:45:00Z',
  },
];

// Service
export const documentService = {
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
    // Check if we're in demo mode
    const demoRole = localStorage.getItem('demoRole');
    if (demoRole && studentId.startsWith('demo-')) {
      // Return demo documents
      let filteredDocs = demoDocuments.filter(doc => doc.student === studentId);
      if (category) {
        filteredDocs = filteredDocs.filter(doc => doc.category === category);
      }
      
      return {
        count: filteredDocs.length,
        documents: filteredDocs,
      };
    }
    
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
          details: 'Please log in with a real account to access your documents. Demo mode has limited functionality.',
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
    // Check if we're in demo mode
    const demoRole = localStorage.getItem('demoRole');
    if (demoRole && id.startsWith('demo-')) {
      // Create a demo file blob
      const demoDoc = demoDocuments.find(doc => doc.id === id);
      if (!demoDoc) {
        throw new Error('Demo document not found');
      }
      
      // Create a simple text file for demo
      const content = `Demo Document: ${demoDoc.fileName}\n\nThis is a demonstration document.\nIn a real system, this would be the actual file content.\n\nDocument Details:\n- Category: ${demoDoc.category}\n- File Type: ${demoDoc.fileType}\n- Upload Date: ${demoDoc.uploadDate}`;
      return new Blob([content], { type: 'text/plain' });
    }
    
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
        throw new Error('Authentication required. Please log in with a real account.');
      }
      throw new Error('Failed to download document');
    }

    return await response.blob();
  },

  /**
   * Get document preview URL
   */
  getDocumentPreviewUrl: (id: string): string => {
    // Check if we're in demo mode
    const demoRole = localStorage.getItem('demoRole');
    if (demoRole && id.startsWith('demo-')) {
      // Return a placeholder for demo documents
      return 'data:text/plain;base64,VGhpcyBpcyBhIGRlbW8gZG9jdW1lbnQgcHJldmlldw==';
    }
    
    // Real API URL
    return `http://localhost:8000/api/documents/${id}/preview/`;
  },

  /**
   * Preview document (for inline viewing)
   */
  previewDocument: async (id: string): Promise<Blob> => {
    // Check if we're in demo mode
    const demoRole = localStorage.getItem('demoRole');
    if (demoRole && id.startsWith('demo-')) {
      // Create a demo preview blob
      const demoDoc = demoDocuments.find(doc => doc.id === id);
      if (!demoDoc) {
        throw new Error('Demo document not found');
      }
      
      // Create appropriate demo content based on file type
      if (demoDoc.fileType === 'pdf') {
        return new Blob(['%PDF-1.4 Demo PDF Content'], { type: 'application/pdf' });
      } else if (demoDoc.fileType === 'jpg' || demoDoc.fileType === 'png') {
        // Create a simple colored rectangle as demo image
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, 400, 300);
          ctx.fillStyle = '#666';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Demo Image', 200, 150);
          ctx.fillText(demoDoc.fileName, 200, 180);
        }
        
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob || new Blob());
          }, `image/${demoDoc.fileType}`);
        });
      } else {
        const content = `Demo Document Preview: ${demoDoc.fileName}`;
        return new Blob([content], { type: 'text/plain' });
      }
    }
    
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
        throw new Error('Authentication required. Please log in with a real account.');
      }
      throw new Error('Failed to preview document');
    }

    return await response.blob();
  },

  /**
   * Set document as profile picture (for Photo category documents)
   */
  setAsProfilePicture: async (documentId: string): Promise<void> => {
    // Check if we're in demo mode
    const demoRole = localStorage.getItem('demoRole');
    if (demoRole && documentId.startsWith('demo-')) {
      // For demo mode, just store in localStorage
      localStorage.setItem('demoProfilePicture', documentId);
      return;
    }
    
    // Real API call - this would need to be implemented in the backend
    // For now, we'll store it in localStorage as a temporary solution
    localStorage.setItem('profilePictureDocumentId', documentId);
  },

  /**
   * Get profile picture URL
   */
  getProfilePictureUrl: (documentId?: string): string | null => {
    if (!documentId) {
      // Check for stored profile picture
      const demoRole = localStorage.getItem('demoRole');
      if (demoRole) {
        documentId = localStorage.getItem('demoProfilePicture') || undefined;
      } else {
        documentId = localStorage.getItem('profilePictureDocumentId') || undefined;
      }
    }
    
    if (!documentId) return null;
    
    return documentService.getDocumentPreviewUrl(documentId);
  },
};

