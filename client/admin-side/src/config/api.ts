/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

// Base API URL - can be configured via environment variables
// Default to localhost for development, override with .env for production
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    register: '/auth/register/',
    login: '/auth/login/',
    logout: '/auth/logout/',
    me: '/auth/me/',
    changePassword: '/auth/change-password/',
  },
  
  // Students
  students: {
    list: '/students/',
    create: '/students/',
    detail: (id: string) => `/students/${id}/`,
    update: (id: string) => `/students/${id}/`,
    delete: (id: string) => `/students/${id}/`,
    discontinued: '/students/discontinued/',
    search: '/students/search/',
    uploadPhoto: (id: string) => `/students/${id}/upload-photo/`,
    transitionToAlumni: (id: string) => `/students/${id}/transition_to_alumni/`,
    disconnectStudies: (id: string) => `/students/${id}/disconnect-studies/`,
    semesterResults: (id: string) => `/students/${id}/semester-results/`,
    semesterAttendance: (id: string) => `/students/${id}/semester-attendance/`,
    bulkUpdateStatus: '/students/bulk-update-status/',
    bulkDelete: '/students/bulk-delete/',
  },
  
  // Admissions
  admissions: {
    list: '/admissions/',
    create: '/admissions/',
    detail: (id: string) => `/admissions/${id}/`,
    approve: (id: string) => `/admissions/${id}/approve/`,
    reject: (id: string) => `/admissions/${id}/reject/`,
    myAdmission: '/admissions/my-admission/',
  },
  
  // Teachers
  teachers: {
    list: '/teachers/',
    detail: (id: string) => `/teachers/${id}/`,
    update: (id: string) => `/teachers/${id}/`,
    delete: (id: string) => `/teachers/${id}/`,
    uploadPhoto: (id: string) => `/teachers/${id}/upload-photo/`,
    requests: '/teacher-requests/signup-requests/',
    requestDetail: (id: string) => `/teacher-requests/signup-requests/${id}/`,
    approveRequest: (id: string) => `/teacher-requests/signup-requests/${id}/approve/`,
    rejectRequest: (id: string) => `/teacher-requests/signup-requests/${id}/reject/`,
    signupRequest: '/teacher-requests/signup-requests/',
  },
  
  // Departments
  departments: {
    list: '/departments/',
    create: '/departments/',
    detail: (id: string) => `/departments/${id}/`,
    update: (id: string) => `/departments/${id}/`,
    delete: (id: string) => `/departments/${id}/`,
    students: (id: string) => `/departments/${id}/students/`,
    teachers: (id: string) => `/departments/${id}/teachers/`,
  },
  
  // Class Routines
  classRoutines: {
    list: '/class-routines/',
    create: '/class-routines/',
    detail: (id: string) => `/class-routines/${id}/`,
    update: (id: string) => `/class-routines/${id}/`,
    delete: (id: string) => `/class-routines/${id}/`,
    myRoutine: '/class-routines/my-routine/',
  },
  
  // Attendance
  attendance: {
    list: '/attendance/',
    create: '/attendance/',
    detail: (id: string) => `/attendance/${id}/`,
    update: (id: string) => `/attendance/${id}/`,
    studentAttendance: (studentId: string) => `/attendance/student/${studentId}/`,
    summary: '/attendance/summary/',
  },
  
  // Marks
  marks: {
    list: '/marks/',
    create: '/marks/',
    detail: (id: string) => `/marks/${id}/`,
    update: (id: string) => `/marks/${id}/`,
    delete: (id: string) => `/marks/${id}/`,
    studentMarks: (studentId: string) => `/marks/student/${studentId}/`,
  },
  
  // Correction Requests
  correctionRequests: {
    list: '/correction-requests/',
    create: '/correction-requests/',
    detail: (id: string) => `/correction-requests/${id}/`,
    approve: (id: string) => `/correction-requests/${id}/approve/`,
    reject: (id: string) => `/correction-requests/${id}/reject/`,
    myRequests: '/correction-requests/my-requests/',
  },
  
  // Applications
  applications: {
    list: '/applications/',
    create: '/applications/',
    detail: (id: string) => `/applications/${id}/`,
    approve: (id: string) => `/applications/${id}/approve/`,
    reject: (id: string) => `/applications/${id}/reject/`,
    myApplications: '/applications/my-applications/',
  },
  
  // Documents
  documents: {
    list: '/documents/',
    upload: '/documents/',
    detail: (id: string) => `/documents/${id}/`,
    download: (id: string) => `/documents/${id}/download/`,
    delete: (id: string) => `/documents/${id}/`,
    myDocuments: '/documents/my-documents/',
  },
  
  // Alumni
  alumni: {
    list: '/alumni/',
    detail: (id: string) => `/alumni/${id}/`,
    update: (id: string) => `/alumni/${id}/`,
    search: '/alumni/search/',
  },
  
  // Activity Logs
  activityLogs: {
    list: '/activity-logs/',
    detail: (id: string) => `/activity-logs/${id}/`,
    export: '/activity-logs/export/',
  },
  
  // Dashboard
  dashboard: {
    stats: '/dashboard/stats/',
    admin: '/dashboard/admin/',
    student: '/dashboard/student/',
    teacher: '/dashboard/teacher/',
  },
  
  // Analytics
  analytics: {
    admissionsTrend: '/analytics/admissions-trend/',
    departmentDistribution: '/analytics/department-distribution/',
    attendanceSummary: '/analytics/attendance-summary/',
    performanceMetrics: '/analytics/performance-metrics/',
  },
  
  // Settings
  settings: {
    get: '/settings/',
    update: '/settings/',
  },
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
