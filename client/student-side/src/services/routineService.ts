/**
 * Class Routine Service
 * Handles API requests for class routine/schedule management (Student-side)
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
export type Shift = 'Morning' | 'Day' | 'Evening';

export interface ClassRoutine {
  id: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  semester: number;
  shift: Shift;
  session: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  teacher?: {
    id: string;
    full_name_english: string;
    designation: string;
  };
  room_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineFilters {
  page?: number;
  page_size?: number;
  department?: string;
  semester?: number;
  shift?: Shift;
  day_of_week?: DayOfWeek;
  teacher?: string;
  is_active?: boolean;
  ordering?: string;
}

export interface MyRoutineParams {
  department?: string;
  semester?: number;
  shift?: Shift;
  teacher?: string;
}

export interface MyRoutineResponse {
  count: number;
  routines: ClassRoutine[];
}

// Service
export const routineService = {
  /**
   * Get my class routine (for logged-in student)
   */
  getMyRoutine: async (params: MyRoutineParams): Promise<MyRoutineResponse> => {
    return await apiClient.get<MyRoutineResponse>('class-routines/my-routine/', params);
  },

  /**
   * Get class routines (general access)
   */
  getRoutine: async (filters?: RoutineFilters): Promise<PaginatedResponse<ClassRoutine>> => {
    return await apiClient.get<PaginatedResponse<ClassRoutine>>('class-routines/', filters);
  },

  /**
   * Get single class routine by ID
   */
  getRoutineById: async (id: string): Promise<ClassRoutine> => {
    return await apiClient.get<ClassRoutine>(`class-routines/${id}/`);
  },
};
