/**
 * API Configuration
 */

// API Base URL - defaults to production API URL
// Override with .env file (VITE_API_BASE_URL) for local development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://47.128.236.25/api';

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    REGISTER: '/auth/register/',
    ME: '/auth/me/',
    CHANGE_PASSWORD: '/auth/change-password/',
  },
  
  // Applications
  APPLICATIONS: {
    LIST: '/applications/',
    SUBMIT: '/applications/submit/',
    MY_APPLICATIONS: '/applications/my-applications/',
    DETAIL: (id: string) => `/applications/${id}/`,
  },
  
  // Students
  STUDENTS: {
    LIST: '/students/',
    DETAIL: (id: string) => `/students/${id}/`,
    CREATE: '/students/',
    UPDATE: (id: string) => `/students/${id}/`,
    DELETE: (id: string) => `/students/${id}/`,
  },
  
  // Admissions
  ADMISSIONS: {
    LIST: '/admissions/',
    SUBMIT: '/admissions/',
    MY_ADMISSION: '/admissions/my-admission/',
    DETAIL: (id: string) => `/admissions/${id}/`,
  },
  
  // Marks
  MARKS: {
    LIST: '/marks/',
    STUDENT_MARKS: (studentId: string) => `/marks/student/${studentId}/`,
    CREATE: '/marks/',
    UPDATE: (id: string) => `/marks/${id}/`,
  },
  
  // Attendance
  ATTENDANCE: {
    LIST: '/attendance/',
    STUDENT_ATTENDANCE: (studentId: string) => `/attendance/student/${studentId}/`,
    CREATE: '/attendance/',
    UPDATE: (id: string) => `/attendance/${id}/`,
  },
  
  // Class Routines
  CLASS_ROUTINES: {
    LIST: '/class-routines/',
    MY_ROUTINE: '/class-routines/my-routine/',
    DETAIL: (id: string) => `/class-routines/${id}/`,
  },
  
  // Departments
  DEPARTMENTS: {
    LIST: '/departments/',
    DETAIL: (id: string) => `/departments/${id}/`,
  },
};
