/**
 * Document Template Service (backend-managed catalog + student availability)
 */
import { apiClient } from '@/lib/api';

export interface BackendDocumentTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  required_fields?: string[];
  available_to_students: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const documentTemplateService = {
  // Admin: full catalog
  async list(): Promise<BackendDocumentTemplate[]> {
    const res = await apiClient.get<{ results?: BackendDocumentTemplate[] } | BackendDocumentTemplate[]>('document-templates/');
    return (Array.isArray(res) ? res : res.results) || [];
  },

  // Public: only templates students may apply for
  async available(): Promise<BackendDocumentTemplate[]> {
    return apiClient.get<BackendDocumentTemplate[]>('document-templates/available/');
  },

  // Admin: update availability / active flags
  async update(id: string, data: Partial<Pick<BackendDocumentTemplate, 'available_to_students' | 'is_active' | 'name' | 'description'>>): Promise<BackendDocumentTemplate> {
    return apiClient.patch<BackendDocumentTemplate>(`document-templates/${id}/`, data);
  },
};

export default documentTemplateService;
