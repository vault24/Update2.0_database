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
  short_name: string;
  head: string | null;
  total_students: number;
  active_students: number;
  faculty_count: number;
  established_year: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentFormData {
  name: string;
  short_name: string;
  head?: string;
  description?: string;
  established_year?: string;
  is_active?: boolean;
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
    return await apiClient.post<Department>(`${this.baseURL}/`, data);
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: Partial<DepartmentFormData>): Promise<Department> {
    return await apiClient.patch<Department>(`${this.baseURL}/${id}/`, data);
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
