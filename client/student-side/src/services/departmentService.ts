/**
 * Department Service
 * Handles department-related API calls
 */

import api, { type PaginatedResponse } from '@/lib/api';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head_of_department?: string;
  total_students?: number;
  total_teachers?: number;
  established_year?: string;
}

class DepartmentService {
  /**
   * Get all departments
   * GET /api/departments/
   */
  async getAll(): Promise<Department[]> {
    try {
      const response = await api.get<PaginatedResponse<Department>>('/departments/');
      return response.results || [];
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      return [];
    }
  }

  /**
   * Get department by ID
   * GET /api/departments/{id}/
   */
  async getById(id: string): Promise<Department> {
    return await api.get<Department>(`/departments/${id}/`);
  }

  /**
   * Get department statistics
   * GET /api/departments/{id}/statistics/
   */
  async getStatistics(id: string): Promise<any> {
    return await api.get(`/departments/${id}/statistics/`);
  }
}

export const departmentService = new DepartmentService();
export default departmentService;
