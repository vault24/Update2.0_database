/**
 * Student Service
 * Handles all student-related API calls
 */

import { apiClient, PaginatedResponse } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

// Types
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
  
  // Educational Background
  highestExam?: string;
  board?: string;
  group?: string;
  rollNumber?: string;
  registrationNumber?: string;
  passingYear?: number;
  gpa?: number;
  institutionName?: string;
  
  // Academic Information
  department: string | { id: string; name: string; code: string };
  departmentName?: string;
  semester: number;
  shift: string;
  session: string;
  currentRollNumber: string;
  currentRegistrationNumber: string;
  currentGroup?: string;
  
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

export interface StudentCreateData {
  fullNameEnglish: string;
  fullNameBangla: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  gender: string;
  religion: string;
  bloodGroup: string;
  nationality: string;
  mobileStudent: string;
  guardianMobile: string;
  email: string;
  emergencyContact: string;
  presentAddress: Address;
  permanentAddress: Address;
  department: string;
  semester: number;
  shift: string;
  session: string;
}

export interface StudentUpdateData extends Partial<StudentCreateData> {
  // Status fields
  status?: string;
  discontinuedReason?: string;
  lastSemester?: number;
  
  // Educational Background (from previous institution)
  highestExam?: string;
  board?: string;
  group?: string;
  rollNumber?: string;
  registrationNumber?: string;
  passingYear?: number;
  gpa?: number;
  institutionName?: string;
  
  // Current Academic Information
  currentGroup?: string;
  currentRollNumber?: string;
  currentRegistrationNumber?: string;
  semester?: number;
  department?: string;
  session?: string;
  shift?: string;
  
  // Additional Personal Info
  fatherNID?: string;
  motherNID?: string;
  birthCertificateNo?: string;
  nidNumber?: string;
  maritalStatus?: string;
  
  // Academic Records
  enrollmentDate?: string;
  semesterResults?: SemesterResult[];
  semesterAttendance?: SemesterAttendance[];
  
  // Media
  profilePhoto?: string;
}


export interface BulkUpdateStatusData {
  student_ids: string[];
  status: 'active' | 'inactive' | 'graduated' | 'discontinued';
}

export interface BulkDeleteData {
  student_ids: string[];
}

export interface DisconnectStudiesData {
  discontinuedReason: string;
  lastSemester?: number;
}

export interface TransitionToAlumniData {
  graduationYear?: number;
}

// Student Service
export const studentService = {
  /**
   * Get list of students with filters and pagination
   */
  async getStudents(filters?: StudentFilters): Promise<PaginatedResponse<Student>> {
    return apiClient.get<PaginatedResponse<Student>>(
      API_ENDPOINTS.students.list,
      filters
    );
  },

  /**
   * Get discontinued students
   */
  async getDiscontinuedStudents(filters?: StudentFilters): Promise<PaginatedResponse<Student>> {
    return apiClient.get<PaginatedResponse<Student>>(
      API_ENDPOINTS.students.discontinued,
      filters
    );
  },

  /**
   * Search students
   */
  async searchStudents(query: string): Promise<Student[]> {
    return apiClient.get<Student[]>(API_ENDPOINTS.students.search, { q: query });
  },

  /**
   * Get student by ID
   */
  async getStudent(id: string): Promise<Student> {
    return apiClient.get<Student>(API_ENDPOINTS.students.detail(id));
  },

  /**
   * Create new student
   */
  async createStudent(data: StudentCreateData): Promise<Student> {
    return apiClient.post<Student>(API_ENDPOINTS.students.create, data);
  },

  /**
   * Update student
   */
  async updateStudent(id: string, data: StudentUpdateData): Promise<Student> {
    return apiClient.put<Student>(API_ENDPOINTS.students.update(id), data);
  },

  /**
   * Partial update student
   */
  async patchStudent(id: string, data: Partial<StudentUpdateData>): Promise<Student> {
    return apiClient.patch<Student>(API_ENDPOINTS.students.update(id), data);
  },

  /**
   * Delete student
   */
  async deleteStudent(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.students.delete(id));
  },

  /**
   * Upload student photo
   */
  async uploadPhoto(id: string, photoFile: File): Promise<Student> {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return apiClient.post<Student>(
      API_ENDPOINTS.students.uploadPhoto(id),
      formData,
      true // isFormData
    );
  },

  /**
   * Transition student to alumni
   */
  async transitionToAlumni(id: string, data?: TransitionToAlumniData): Promise<any> {
    return apiClient.post(API_ENDPOINTS.students.transitionToAlumni(id), data);
  },

  /**
   * Disconnect student studies (mark as discontinued)
   */
  async disconnectStudies(id: string, data: DisconnectStudiesData): Promise<Student> {
    return apiClient.post<Student>(
      API_ENDPOINTS.students.disconnectStudies(id),
      data
    );
  },

  /**
   * Get student semester results
   */
  async getSemesterResults(id: string): Promise<{
    studentId: string;
    studentName: string;
    semesterResults: SemesterResult[];
  }> {
    return apiClient.get(API_ENDPOINTS.students.semesterResults(id));
  },

  /**
   * Get student semester attendance
   */
  async getSemesterAttendance(id: string): Promise<{
    studentId: string;
    studentName: string;
    semesterAttendance: SemesterAttendance[];
    averageAttendance: number;
  }> {
    return apiClient.get(API_ENDPOINTS.students.semesterAttendance(id));
  },

  /**
   * Bulk update student status
   */
  async bulkUpdateStatus(data: BulkUpdateStatusData): Promise<{
    message: string;
    updated_count: number;
  }> {
    return apiClient.post(API_ENDPOINTS.students.bulkUpdateStatus, data);
  },

  /**
   * Bulk delete students
   */
  async bulkDelete(data: BulkDeleteData): Promise<{
    message: string;
    deleted_count: number;
  }> {
    return apiClient.post(API_ENDPOINTS.students.bulkDelete, data);
  },
};
