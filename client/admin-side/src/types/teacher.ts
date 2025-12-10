/**
 * Teacher Management Types
 */

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Qualification {
  degree: string;
  institution: string;
  year: number;
}

export interface Teacher {
  id: string;
  fullNameBangla: string;
  fullNameEnglish: string;
  designation: string;
  department: Department;
  email: string;
  mobileNumber: string;
  officeLocation: string;
  subjects: string[];
  employmentStatus: 'active' | 'on_leave' | 'retired';
  joiningDate: string;
  profilePhoto?: string;
  qualifications: Qualification[];
  specializations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeacherBasic {
  id: string;
  fullNameEnglish: string;
  designation: string;
  department: string;
}

export interface StudentBasic {
  id: string;
  fullNameEnglish: string;
  currentRollNumber: string;
  mobileStudent: string;
  email: string;
}

export interface TeacherRequest {
  id: string;
  student: StudentBasic;
  teacher: TeacherBasic;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'archived';
  requestDate: string;
  resolvedDate?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherRequestStats {
  pending: number;
  resolved: number;
  archived: number;
  total: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
