/**
 * Department Service
 * Handles API requests for department management
 */

import { apiClient } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/api';

// Types
export interface Department {
  id: string;
  name: string;
  code: string;
  short_name: string;
  head: string | null;
  established_year: string | null;
  photo: string | null;
  photo_url: string | null;
  total_students: number;
  active_students: number;
  faculty_count: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentFormData {
  name: string;
  code?: string;
  short_name?: string;
  head?: string;
  established_year?: string;
  photo?: File | null;
}

class DepartmentService {
  private baseURL = '/departments';

  /**
   * Get all departments
   */
  async getDepartments(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Department>> {
    return await apiClient.get<PaginatedResponse<Department>>(
      `${this.baseURL}/`,
      params
    );
  }

  /**
   * Get department by ID
   */
  async getDepartment(id: string): Promise<Department> {
    return await apiClient.get<Department>(`${this.baseURL}/${id}/`);
  }

  /**
   * Create new department
   */
  async createDepartment(data: DepartmentFormData): Promise<Department> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.code) formData.append('code', data.code);
    if (data.short_name) formData.append('short_name', data.short_name);
    // Always append optional fields, even if empty
    formData.append('head', data.head || '');
    formData.append('established_year', data.established_year || '');
    if (data.photo) formData.append('photo', data.photo);
    
    return await apiClient.post<Department>(`${this.baseURL}/`, formData);
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: Partial<DepartmentFormData>): Promise<Department> {
    // If photo is being uploaded, use FormData
    if (data.photo) {
      const formData = new FormData();
      if (data.name !== undefined) formData.append('name', data.name);
      if (data.code !== undefined) formData.append('code', data.code);
      if (data.short_name !== undefined) formData.append('short_name', data.short_name);
      if (data.head !== undefined) formData.append('head', data.head || '');
      if (data.established_year !== undefined) formData.append('established_year', data.established_year || '');
      formData.append('photo', data.photo);
      
      return await apiClient.patch<Department>(`${this.baseURL}/${id}/`, formData);
    }
    
    // Otherwise use regular JSON
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.short_name !== undefined) updateData.short_name = data.short_name;
    // Always include optional fields if they're in the data, even if empty
    if (data.head !== undefined) updateData.head = data.head || '';
    if (data.established_year !== undefined) updateData.established_year = data.established_year || '';
    
    return await apiClient.patch<Department>(`${this.baseURL}/${id}/`, updateData);
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string): Promise<void> {
    return await apiClient.delete<void>(`${this.baseURL}/${id}/`);
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(): Promise<{
    total_departments: number;
    active_departments: number;
    total_students: number;
    total_faculty: number;
  }> {
    return await apiClient.get(`${this.baseURL}/stats/`);
  }
}

const departmentService = new DepartmentService();
export default departmentService;
