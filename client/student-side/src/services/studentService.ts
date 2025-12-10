/**
 * Student Service (Student-side)
 * Handles API requests for student data
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export interface Address {
  village: string;
  postOffice: string;
  upazila: string;
  district: string;
  division: string;
}

export interface SemesterResult {
  semester: number;
  year: number;
  resultType: 'gpa' | 'referred';
  gpa?: number;
  cgpa?: number;
  subjects?: SubjectResult[];
  referredSubjects?: string[];
}

export interface SubjectResult {
  code: string;
  name: string;
  credit: number;
  grade: string;
  gradePoint: number;
}

export interface SemesterAttendance {
  semester: number;
  year: number;
  subjects: SubjectAttendance[];
  averagePercentage: number;
}

export interface SubjectAttendance {
  code: string;
  name: string;
  present: number;
  total: number;
  percentage: number;
}

export interface Student {
  id: string;
  fullNameEnglish: string;
  fullNameBangla: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  gender: string;
  religion: string;
  bloodGroup: string;
  nationality: string;
  
  // Contact Information
  mobileStudent: string;
  guardianMobile: string;
  email: string;
  emergencyContact: string;
  presentAddress: Address;
  permanentAddress: Address;
  
  // Academic Information
  department: string | { id: string; name: string; code: string };
  departmentName?: string;
  semester: number;
  shift: string;
  session: string;
  currentRollNumber: string;
  currentRegistrationNumber: string;
  
  // Status
  status: 'active' | 'inactive' | 'graduated' | 'discontinued';
  discontinuedReason?: string;
  lastSemester?: number;
  
  // Additional Information
  profilePhoto?: string;
  semesterResults?: SemesterResult[];
  semesterAttendance?: SemesterAttendance[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface StudentFilters {
  department?: string;
  semester?: number;
  status?: string;
  shift?: string;
  session?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// Service
export const studentService = {
  /**
   * Get list of students with filters
   */
  getStudents: async (filters?: StudentFilters): Promise<PaginatedResponse<Student>> => {
    return await apiClient.get<PaginatedResponse<Student>>('students/', filters);
  },

  /**
   * Get student by ID
   */
  getStudent: async (id: string): Promise<Student> => {
    return await apiClient.get<Student>(`students/${id}/`);
  },

  /**
   * Get current logged-in student's profile
   */
  getMe: async (studentId: string): Promise<Student> => {
    return await apiClient.get<Student>(`students/${studentId}/`);
  },
};
