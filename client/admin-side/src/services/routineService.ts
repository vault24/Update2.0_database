/**
 * Class Routine Service
 * Handles API requests for class routine/schedule management
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
export type Shift = 'Morning' | 'Day' | 'Evening';

export type RoutineId = string;

export interface ClassRoutine {
  id: RoutineId;
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
    fullNameEnglish: string;
    designation: string;
    department: {
      id: string;
      name: string;
      code: string;
    };
    email: string;
    mobileNumber: string;
    employmentStatus: string;
    profilePhoto: string;
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

export interface RoutineCreateData {
  department: string;
  semester: number;
  shift: Shift;
  session: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  teacher?: string;
  room_number: string;
  is_active?: boolean;
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

export interface ClassSlot {
  id?: string;
  subject: string;
  teacher: string;
  room: string;
}

export type RoutineGridData = Record<string, Record<string, ClassSlot | null>>;

export interface RoutineOperation {
  operation: 'create' | 'update' | 'delete';
  id?: RoutineId;
  data?: Partial<RoutineCreateData>;
}

export interface BulkUpdateRequest {
  operations: RoutineOperation[];
}

export interface BulkUpdateResponse {
  success: boolean;
  message: string;
  results?: any[];
  errors?: any[];
  completed_operations: number;
  total_operations: number;
}

// Service
export const routineService = {
  /**
   * Get paginated list of class routines
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

  /**
   * Create class routine
   */
  createRoutine: async (data: RoutineCreateData): Promise<ClassRoutine> => {
    return await apiClient.post<ClassRoutine>('class-routines/', data);
  },

  /**
   * Update class routine
   */
  updateRoutine: async (id: string, data: Partial<RoutineCreateData>): Promise<ClassRoutine> => {
    return await apiClient.patch<ClassRoutine>(`class-routines/${id}/`, data);
  },

  /**
   * Delete class routine
   */
  deleteRoutine: async (id: string): Promise<void> => {
    return await apiClient.delete<void>(`class-routines/${id}/`);
  },

  /**
   * Get routine for student or teacher
   */
  getMyRoutine: async (params: MyRoutineParams): Promise<MyRoutineResponse> => {
    return await apiClient.get<MyRoutineResponse>('class-routines/my-routine/', params);
  },

  /**
   * Bulk update class routines
   */
  bulkUpdate: async (request: BulkUpdateRequest): Promise<BulkUpdateResponse> => {
    return await apiClient.post<BulkUpdateResponse>('class-routines/bulk-update/', request);
  },
};

// Data transformation utilities
export const routineTransformers = {
  /**
   * Convert time slot display format to API time format
   * Example: "8:00-8:45" -> { startTime: "08:00", endTime: "08:45" }
   */
  parseTimeSlot: (timeSlot: string): { start_time: string; end_time: string } => {
    const [start, end] = timeSlot.split('-');
    
    const formatTime = (time: string): string => {
      const [hour, minute] = time.split(':');
      const hour24 = parseInt(hour);
      
      // Handle 12-hour to 24-hour conversion
      let formattedHour: number;
      if (hour24 === 12) {
        formattedHour = 12; // 12:xx stays as 12:xx
      } else if (hour24 < 8) {
        formattedHour = hour24 + 12; // PM hours (1:xx -> 13:xx)
      } else {
        formattedHour = hour24; // AM hours (8:xx -> 8:xx)
      }
      
      return `${formattedHour.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
    };
    
    return {
      start_time: formatTime(start),
      end_time: formatTime(end)
    };
  },

  /**
   * Convert API time format to display time slot format
   * Example: { startTime: "08:00", endTime: "08:45" } -> "8:00-8:45"
   */
  formatTimeSlot: (start_time: string, end_time: string): string => {
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(':');
      const hour24 = parseInt(hours);
      
      // Convert 24-hour to 12-hour display format
      let displayHour: number;
      if (hour24 === 0) {
        displayHour = 12; // 00:xx -> 12:xx
      } else if (hour24 > 12) {
        displayHour = hour24 - 12; // 13:xx -> 1:xx
      } else {
        displayHour = hour24; // 8:xx -> 8:xx
      }
      
      return `${displayHour}:${minutes}`;
    };
    
    return `${formatTime(start_time)}-${formatTime(end_time)}`;
  },

  /**
   * Convert API routine data to grid format for admin interface
   */
  apiToGrid: (routines: ClassRoutine[], timeSlots: string[]): RoutineGridData => {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const gridData: RoutineGridData = {};
    
    // Initialize empty grid
    days.forEach(day => {
      gridData[day] = {};
      timeSlots.forEach(slot => {
        gridData[day][slot] = null;
      });
    });

    // Populate grid with routine data
    routines.forEach((routine) => {
      const timeSlot = routineTransformers.formatTimeSlot(routine.start_time, routine.end_time);
      if (gridData[routine.day_of_week] && timeSlots.includes(timeSlot)) {
        gridData[routine.day_of_week][timeSlot] = {
          id: routine.id,
          subject: routine.subject_name,
          teacher: routine.teacher?.fullNameEnglish || 'TBA',
          room: routine.room_number,
        };
      }
    });

    return gridData;
  },

  /**
   * Convert grid format to API operations for bulk update
   */
  gridToOperations: (
    currentGrid: RoutineGridData,
    originalRoutines: ClassRoutine[],
    filters: { department: string; semester: number; shift: Shift; session: string }
  ): RoutineOperation[] => {
    const operations: RoutineOperation[] = [];
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    
    console.log('gridToOperations called with:', {
      currentGrid,
      originalRoutines: originalRoutines.length,
      filters
    });
    
    // Create a map of existing routines by day and time slot
    const existingRoutineMap = new Map<string, ClassRoutine>();
    originalRoutines.forEach(routine => {
      const timeSlot = routineTransformers.formatTimeSlot(routine.start_time, routine.end_time);
      const key = `${routine.day_of_week}-${timeSlot}`;
      existingRoutineMap.set(key, routine);
    });

    console.log('Existing routine map keys:', Array.from(existingRoutineMap.keys()));

    // Process each slot in the grid
    days.forEach(day => {
      const daySlots = currentGrid[day] || {};
      console.log(`Processing day ${day}:`, daySlots);
      
      Object.entries(daySlots).forEach(([timeSlot, classSlot]) => {
        const key = `${day}-${timeSlot}`;
        const existingRoutine = existingRoutineMap.get(key);
        
        console.log(`Processing slot ${key}:`, { classSlot, hasExisting: !!existingRoutine });
        
        if (classSlot === null) {
          // Slot is empty - delete if routine exists
          if (existingRoutine) {
            console.log(`Adding delete operation for ${key}`);
            operations.push({
              operation: 'delete',
              id: existingRoutine.id
            });
          }
        } else {
          // Slot has data
          const { start_time, end_time } = routineTransformers.parseTimeSlot(timeSlot);
          const routineData: Partial<RoutineCreateData> = {
            department: filters.department,
            semester: filters.semester,
            shift: filters.shift,
            session: filters.session,
            day_of_week: day,
            start_time,
            end_time,
            subject_name: classSlot.subject,
            subject_code: classSlot.subject.toUpperCase().replace(/\s+/g, ''),
            room_number: classSlot.room,
            is_active: true
          };

          // Add teacher if provided and not 'TBA'
          if (classSlot.teacher && classSlot.teacher !== 'TBA') {
            // Note: This would need teacher ID lookup in a real implementation
            // For now, we'll leave teacher as undefined
          }

          if (existingRoutine) {
            // Update existing routine
            const hasChanges = 
              existingRoutine.subject_name !== classSlot.subject ||
              existingRoutine.room_number !== classSlot.room ||
              (existingRoutine.teacher?.fullNameEnglish || 'TBA') !== classSlot.teacher;
            
            if (hasChanges) {
              console.log(`Adding update operation for ${key}`);
              operations.push({
                operation: 'update',
                id: existingRoutine.id,
                data: routineData
              });
            } else {
              console.log(`No changes for ${key}`);
            }
          } else {
            // Create new routine
            console.log(`Adding create operation for ${key}:`, routineData);
            operations.push({
              operation: 'create',
              data: routineData as RoutineCreateData
            });
          }
        }
        
        // Remove from existing map to track processed items
        existingRoutineMap.delete(key);
      });
    });

    // Any remaining items in existingRoutineMap should be deleted
    // (they exist in the database but not in the current grid)
    existingRoutineMap.forEach(routine => {
      const timeSlot = routineTransformers.formatTimeSlot(routine.start_time, routine.end_time);
      const key = `${routine.day_of_week}-${timeSlot}`;
      console.log(`Adding delete operation for orphaned routine ${key}`);
      operations.push({
        operation: 'delete',
        id: routine.id
      });
    });

    console.log('Final operations:', operations);
    return operations;
  },

  /**
   * Save routine changes using bulk update API
   */
  saveRoutineChanges: async (
    currentGrid: RoutineGridData,
    originalRoutines: ClassRoutine[],
    filters: { department: string; semester: number; shift: Shift; session: string }
  ): Promise<BulkUpdateResponse> => {
    try {
      console.log('saveRoutineChanges called with:', {
        currentGrid,
        originalRoutines: originalRoutines.length,
        filters
      });
      
      const operations = routineTransformers.gridToOperations(currentGrid, originalRoutines, filters);
      
      console.log('Generated operations:', operations);
      
      if (operations.length === 0) {
        console.log('No operations to perform');
        return {
          success: true,
          message: 'No changes to save',
          completed_operations: 0,
          total_operations: 0
        };
      }

      console.log('Calling bulkUpdate with operations:', operations);
      const result = await routineService.bulkUpdate({ operations });
      console.log('BulkUpdate result:', result);
      return result;
    } catch (error) {
      console.error('Error in saveRoutineChanges:', error);
      throw error;
    }
  }
};
