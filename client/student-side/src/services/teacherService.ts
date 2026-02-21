/**
 * Teacher Service (Student-side)
 * Handles API requests for teacher data
 */

import api, { PaginatedResponse } from '@/lib/api';

// Types
export interface Teacher {
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
  officeLocation?: string;
  subjects?: string[];
  employmentStatus: string;
  profilePhoto?: string;
}

export interface TeacherProfile {
  id: string;
  fullNameBangla: string;
  fullNameEnglish: string;
  designation: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  subjects: string[];
  qualifications: any[];
  specializations: string[];
  shifts: string[];
  email: string;
  mobileNumber: string;
  officeLocation: string;
  employmentStatus: string;
  joiningDate: string;
  profilePhoto?: string;
  coverPhoto?: string;
  headline: string;
  about: string;
  skills: string[];
  experiences: Experience[];
  education: Education[];
  publications: Publication[];
  research: Research[];
  awards: Award[];
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  id?: string;
  title: string;
  institution: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  order?: number;
}

export interface Education {
  id?: string;
  degree: string;
  institution: string;
  year: string;
  field: string;
  order?: number;
}

export interface Publication {
  id?: string;
  title: string;
  journal: string;
  year: string;
  citations: number;
  link?: string;
  order?: number;
}

export interface Research {
  id?: string;
  title: string;
  status: 'ongoing' | 'completed';
  year: string;
  description: string;
  order?: number;
}

export interface Award {
  id?: string;
  title: string;
  issuer: string;
  year: string;
  order?: number;
}

export interface TeacherFilters {
  department?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface ProfileUpdateData {
  headline?: string;
  about?: string;
  skills?: string[];
  specializations?: string[];
  coverPhoto?: string;
}

// Service
export const teacherService = {
  /**
   * Get list of teachers with filters
   */
  getTeachers: async (filters?: TeacherFilters): Promise<PaginatedResponse<Teacher>> => {
    return await api.get<PaginatedResponse<Teacher>>('teachers/', filters);
  },

  /**
   * Get teacher by ID
   */
  getTeacher: async (id: string): Promise<Teacher> => {
    return await api.get<Teacher>(`teachers/${id}/`);
  },

  /**
   * Get complete teacher profile with all related data
   */
  getTeacherProfile: async (id: string): Promise<TeacherProfile> => {
    return await api.get<TeacherProfile>(`teachers/${id}/profile/`);
  },

  /**
   * Update teacher profile fields
   */
  updateProfile: async (id: string, data: ProfileUpdateData): Promise<TeacherProfile> => {
    return await api.patch<TeacherProfile>(`teachers/${id}/update_profile/`, data);
  },

  // Experience methods
  addExperience: async (teacherId: string, data: Experience): Promise<Experience> => {
    return await api.post<Experience>(`teachers/${teacherId}/add_experience/`, data);
  },

  updateExperience: async (teacherId: string, expId: string, data: Experience): Promise<Experience> => {
    return await api.put<Experience>(`teachers/${teacherId}/experience/${expId}/`, data);
  },

  deleteExperience: async (teacherId: string, expId: string): Promise<void> => {
    return await api.delete(`teachers/${teacherId}/experience/${expId}/`);
  },

  // Education methods
  addEducation: async (teacherId: string, data: Education): Promise<Education> => {
    return await api.post<Education>(`teachers/${teacherId}/add_education/`, data);
  },

  updateEducation: async (teacherId: string, eduId: string, data: Education): Promise<Education> => {
    return await api.put<Education>(`teachers/${teacherId}/education/${eduId}/`, data);
  },

  deleteEducation: async (teacherId: string, eduId: string): Promise<void> => {
    return await api.delete(`teachers/${teacherId}/education/${eduId}/`);
  },

  // Publication methods
  addPublication: async (teacherId: string, data: Publication): Promise<Publication> => {
    return await api.post<Publication>(`teachers/${teacherId}/add_publication/`, data);
  },

  updatePublication: async (teacherId: string, pubId: string, data: Publication): Promise<Publication> => {
    return await api.put<Publication>(`teachers/${teacherId}/publication/${pubId}/`, data);
  },

  deletePublication: async (teacherId: string, pubId: string): Promise<void> => {
    return await api.delete(`teachers/${teacherId}/publication/${pubId}/`);
  },

  // Research methods
  addResearch: async (teacherId: string, data: Research): Promise<Research> => {
    return await api.post<Research>(`teachers/${teacherId}/add_research/`, data);
  },

  updateResearch: async (teacherId: string, resId: string, data: Research): Promise<Research> => {
    return await api.put<Research>(`teachers/${teacherId}/research/${resId}/`, data);
  },

  deleteResearch: async (teacherId: string, resId: string): Promise<void> => {
    return await api.delete(`teachers/${teacherId}/research/${resId}/`);
  },

  // Award methods
  addAward: async (teacherId: string, data: Award): Promise<Award> => {
    return await api.post<Award>(`teachers/${teacherId}/add_award/`, data);
  },

  updateAward: async (teacherId: string, awardId: string, data: Award): Promise<Award> => {
    return await api.put<Award>(`teachers/${teacherId}/award/${awardId}/`, data);
  },

  deleteAward: async (teacherId: string, awardId: string): Promise<void> => {
    return await api.delete(`teachers/${teacherId}/award/${awardId}/`);
  },
};
