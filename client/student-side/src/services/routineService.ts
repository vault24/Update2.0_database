/**
 * Class Routine Service
 * Handles API requests for class routine/schedule management (Student-side)
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Cache management for routine data (shared with admin)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class RoutineCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Generate cache key from parameters
  private generateKey(prefix: string, params?: any): string {
    if (!params) return prefix;
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as any);
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  // Get cached data if valid
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache hit for key: ${key}`);
    return entry.data;
  }

  // Set cache data
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
    console.log(`Cache set for key: ${key}`);
  }

  // Invalidate specific cache entries
  invalidate(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      console.log('Clearing all routine cache');
      this.cache.clear();
      return;
    }

    // Clear entries matching pattern
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`Cache invalidated for key: ${key}`);
    });
  }

  // Invalidate by filters (department, semester, shift)
  invalidateByFilters(filters: { department?: string; semester?: number; shift?: Shift }): void {
    const patterns: string[] = [];
    
    if (filters.department) patterns.push(`department":"${filters.department}"`);
    if (filters.semester) patterns.push(`semester":${filters.semester}`);
    if (filters.shift) patterns.push(`shift":"${filters.shift}"`);

    if (patterns.length === 0) {
      this.invalidate(); // Clear all if no specific filters
      return;
    }

    patterns.forEach(pattern => this.invalidate(pattern));
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
const routineCache = new RoutineCache();

// Filter validation utilities
export const filterValidation = {
  /**
   * Validate department ID
   */
  validateDepartment: (department?: string): boolean => {
    return !!(department && typeof department === 'string' && department.trim().length > 0);
  },

  /**
   * Validate semester value
   */
  validateSemester: (semester?: number): boolean => {
    return !!(semester && typeof semester === 'number' && semester >= 1 && semester <= 8);
  },

  /**
   * Validate shift value
   */
  validateShift: (shift?: Shift): boolean => {
    return !!(shift && ['Morning', 'Day', 'Evening'].includes(shift));
  },

  /**
   * Validate complete filter set
   */
  validateFilters: (filters: { department?: string; semester?: number; shift?: Shift }): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];

    if (!filterValidation.validateDepartment(filters.department)) {
      errors.push('Invalid or missing department');
    }

    if (!filterValidation.validateSemester(filters.semester)) {
      errors.push('Invalid semester (must be 1-8)');
    }

    if (!filterValidation.validateShift(filters.shift)) {
      errors.push('Invalid shift (must be Morning, Day, or Evening)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Sanitize filters by removing invalid values
   */
  sanitizeFilters: (filters: any): any => {
    const sanitized: any = {};

    if (filterValidation.validateDepartment(filters.department)) {
      sanitized.department = filters.department.trim();
    }

    if (filterValidation.validateSemester(filters.semester)) {
      sanitized.semester = filters.semester;
    }

    if (filterValidation.validateShift(filters.shift)) {
      sanitized.shift = filters.shift;
    } else if (filters.shift) {
      // Default to Day if shift is provided but invalid
      sanitized.shift = 'Day';
    }

    // Copy other valid parameters
    Object.keys(filters).forEach(key => {
      if (!['department', 'semester', 'shift'].includes(key) && filters[key] !== undefined) {
        sanitized[key] = filters[key];
      }
    });

    return sanitized;
  }
};

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

export interface MyRoutineParams {
  department?: string;
  semester?: number;
  shift?: Shift;
  teacher?: string;
  _t?: number; // Cache busting parameter
}

export interface MyRoutineResponse {
  count: number;
  routines: ClassRoutine[];
}

// Service
export const routineService = {
  /**
   * Get my class routine (for logged-in student) with caching and filter validation
   */
  getMyRoutine: async (params: MyRoutineParams): Promise<MyRoutineResponse> => {
    // Sanitize parameters to ensure valid values
    const sanitizedParams = filterValidation.sanitizeFilters(params);
    const cacheKey = routineCache['generateKey']('getMyRoutine', sanitizedParams);
    
    // Try to get from cache first
    const cached = routineCache.get<MyRoutineResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API with sanitized parameters and cache the result
    const result = await apiClient.get<MyRoutineResponse>('class-routines/my-routine/', sanitizedParams);
    routineCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get class routines (general access) with caching
   */
  getRoutine: async (filters?: RoutineFilters): Promise<PaginatedResponse<ClassRoutine>> => {
    const cacheKey = routineCache['generateKey']('getRoutine', filters);
    
    // Try to get from cache first
    const cached = routineCache.get<PaginatedResponse<ClassRoutine>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API and cache the result
    const result = await apiClient.get<PaginatedResponse<ClassRoutine>>('class-routines/', filters);
    routineCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get single class routine by ID with caching
   */
  getRoutineById: async (id: string): Promise<ClassRoutine> => {
    const cacheKey = routineCache['generateKey']('getRoutineById', { id });
    
    // Try to get from cache first
    const cached = routineCache.get<ClassRoutine>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API and cache the result
    const result = await apiClient.get<ClassRoutine>(`class-routines/${id}/`);
    routineCache.set(cacheKey, result);
    return result;
  },

  /**
   * Cache management utilities
   */
  cache: {
    /**
     * Manually invalidate cache
     */
    invalidate: (pattern?: string) => {
      routineCache.invalidate(pattern);
    },

    /**
     * Invalidate cache by filters
     */
    invalidateByFilters: (filters: { department?: string; semester?: number; shift?: Shift }) => {
      routineCache.invalidateByFilters(filters);
    },

    /**
     * Get cache statistics
     */
    getStats: () => {
      return routineCache.getStats();
    },

    /**
     * Clear all cache
     */
    clear: () => {
      routineCache.invalidate();
    }
  }
};
