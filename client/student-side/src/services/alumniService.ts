// Alumni Service - Matching admin-side fields
import { apiClient } from '@/lib/api';

export type CareerType = 'job' | 'higherStudies' | 'business' | 'other';
export type SkillCategory = 'technical' | 'soft' | 'language' | 'other';
export type HighlightType = 'achievement' | 'milestone' | 'award' | 'project';
export type SupportStatus = 'needSupport' | 'needExtraSupport' | 'noSupportNeeded';
export type CourseStatus = 'completed' | 'in_progress' | 'planned';

export interface CareerEntry {
  id: string;
  type: CareerType;
  position: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements?: string[];
  // Job specific
  salary?: string;
  // Higher studies specific
  degree?: string;
  field?: string;
  institution?: string;
  // Business specific
  businessName?: string;
  businessType?: string;
  // Other specific
  otherType?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: number; // 1-100
}

export interface CareerHighlight {
  id: string;
  title: string;
  description: string;
  date: string;
  type: HighlightType;
}

export interface Course {
  id: string;
  name: string;
  provider: string;
  status: CourseStatus;
  completionDate?: string;
  certificateId?: string;
  certificateUrl?: string;
  description?: string;
}

export interface AlumniProfile {
  id: string;
  name: string;
  roll: string;
  department: string;
  graduationYear: string;
  email: string;
  phone: string;
  currentJob: string;
  company: string;
  location: string;
  gpa: number;
  avatar: string;
  category: string; // alumni type
  supportStatus: SupportStatus;
  higherStudiesInstitute?: string;
  businessName?: string;
  careers: CareerEntry[];
  skills: Skill[];
  highlights: CareerHighlight[];
  courses: Course[];
  bio?: string;
  linkedin?: string;
  portfolio?: string;
}

function toApiDate(value?: string | null): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  return trimmed;
}

function toMonthValue(value?: string | null): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(0, 7);
  return trimmed;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getStudentCgpa(student: any): number {
  const semesterResults = Array.isArray(student?.semesterResults) ? student.semesterResults : [];
  if (semesterResults.length > 0) {
    const sortedResults = [...semesterResults].sort(
      (a: any, b: any) => Number(a?.semester || 0) - Number(b?.semester || 0),
    );
    const latestResult = sortedResults[sortedResults.length - 1] || {};
    const cgpaFromResult = toNumber(latestResult.cgpa ?? latestResult.gpa);
    if (cgpaFromResult !== null) return cgpaFromResult;
  }

  return toNumber(student?.gpa) ?? 0;
}

// API functions
export const alumniService = {
  getProfile: async (id?: string): Promise<AlumniProfile> => {
    try {
      // If no ID provided, get current user's profile
      const endpoint = id ? `/alumni/${id}/` : '/alumni/my_profile/';
      const response = await apiClient.get<any>(endpoint);
      
      // Transform backend data to frontend format
      return transformBackendToFrontend(response);
    } catch (error: any) {
      console.error('Error fetching alumni profile:', error);
      
      // If it's a 404, provide a more helpful error message
      if (error.status_code === 404 || error.error?.includes('not found')) {
        const notFoundError = new Error('Alumni profile not found. You may not have an alumni profile yet.');
        throw notFoundError;
      }
      
      throw error;
    }
  },

  updateProfile: async (data: Partial<AlumniProfile>): Promise<AlumniProfile> => {
    try {
      // Transform frontend data to backend format
      const backendData = {
        bio: data.bio,
        linkedinUrl: data.linkedin,
        portfolioUrl: data.portfolio,
        email: data.email,
        phone: data.phone,
        location: data.location,
      };
      
      const response = await apiClient.patch<any>('/alumni/update_my_profile/', backendData);
      return transformBackendToFrontend(response);
    } catch (error) {
      console.error('Error updating alumni profile:', error);
      throw error;
    }
  },

  addCareer: async (career: Omit<CareerEntry, 'id'>): Promise<CareerEntry> => {
    try {
      const startDate = toApiDate(career.startDate) || career.startDate;
      const endDate = career.current ? null : toApiDate(career.endDate);

      // Transform frontend career data to backend format
      const backendData = {
        positionType: career.type,
        organizationName: career.company,
        positionTitle: career.position,
        startDate,
        endDate,
        isCurrent: career.current,
        description: career.description || '',
        location: career.location || '',
        salary: career.salary || '',
        degree: career.degree || '',
        field: career.field || '',
        institution: career.institution || '',
        businessName: career.businessName || '',
        businessType: career.businessType || '',
        otherType: career.otherType || '',
      };
      
      const response = await apiClient.post<any>('/alumni/add_my_career/', backendData);
      const transformed = transformBackendToFrontend(response);
      
      const newlyAddedCareer = transformed.careers.find((item) =>
        item.type === career.type &&
        item.position === career.position &&
        item.company === career.company &&
        item.startDate === toMonthValue(startDate) &&
        (item.endDate || '') === toMonthValue(endDate || ''),
      );

      return newlyAddedCareer || transformed.careers[0];
    } catch (error: any) {
      console.error('Error adding career:', error);
      // Better error handling for validation errors
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${msgArray.join(', ')}`;
            })
            .join('; ');
          throw new Error(errorMessages || 'Failed to add career');
        }
      }
      throw error;
    }
  },

  updateCareer: async (career: CareerEntry): Promise<CareerEntry> => {
    try {
      const startDate = toApiDate(career.startDate) || career.startDate;
      const endDate = career.current ? null : toApiDate(career.endDate);

      const backendData = {
        positionType: career.type,
        organizationName: career.company,
        positionTitle: career.position,
        startDate,
        endDate,
        isCurrent: career.current,
        description: career.description,
        location: career.location,
        salary: career.salary,
        degree: career.degree,
        field: career.field,
        institution: career.institution,
        businessName: career.businessName,
        businessType: career.businessType,
        otherType: career.otherType,
      };
      
      const response = await apiClient.put<any>(`/alumni/update-my-career/${career.id}/`, backendData);
      const transformed = transformBackendToFrontend(response);
      
      // Find and return the updated career
      const updatedCareer = transformed.careers.find(c => c.id === career.id);
      return updatedCareer || career;
    } catch (error) {
      console.error('Error updating career:', error);
      throw error;
    }
  },

  deleteCareer: async (careerId: string): Promise<void> => {
    try {
      await apiClient.delete(`/alumni/delete-my-career/${careerId}/`);
    } catch (error) {
      console.error('Error deleting career:', error);
      throw error;
    }
  },

  addSkill: async (skill: Omit<Skill, 'id'>): Promise<Skill> => {
    try {
      const response = await apiClient.post<any>('/alumni/add_my_skill/', skill);
      const transformed = transformBackendToFrontend(response);
      
      // Return the newly added skill
      return transformed.skills[transformed.skills.length - 1];
    } catch (error) {
      console.error('Error adding skill:', error);
      throw error;
    }
  },

  updateSkill: async (skill: Skill): Promise<Skill> => {
    try {
      const response = await apiClient.put<any>(`/alumni/update-my-skill/${skill.id}/`, skill);
      const transformed = transformBackendToFrontend(response);
      
      // Find and return the updated skill
      const updatedSkill = transformed.skills.find(s => s.id === skill.id);
      return updatedSkill || skill;
    } catch (error) {
      console.error('Error updating skill:', error);
      throw error;
    }
  },

  deleteSkill: async (skillId: string): Promise<void> => {
    try {
      await apiClient.delete(`/alumni/delete-my-skill/${skillId}/`);
    } catch (error) {
      console.error('Error deleting skill:', error);
      throw error;
    }
  },

  addHighlight: async (highlight: Omit<CareerHighlight, 'id'>): Promise<CareerHighlight> => {
    try {
      const response = await apiClient.post<any>('/alumni/add_my_highlight/', highlight);
      const transformed = transformBackendToFrontend(response);
      
      // Return the newly added highlight
      return transformed.highlights[transformed.highlights.length - 1];
    } catch (error) {
      console.error('Error adding highlight:', error);
      throw error;
    }
  },

  updateHighlight: async (highlight: CareerHighlight): Promise<CareerHighlight> => {
    try {
      const response = await apiClient.put<any>(`/alumni/update-my-highlight/${highlight.id}/`, highlight);
      const transformed = transformBackendToFrontend(response);
      
      // Find and return the updated highlight
      const updatedHighlight = transformed.highlights.find(h => h.id === highlight.id);
      return updatedHighlight || highlight;
    } catch (error) {
      console.error('Error updating highlight:', error);
      throw error;
    }
  },

  deleteHighlight: async (highlightId: string): Promise<void> => {
    try {
      await apiClient.delete(`/alumni/delete-my-highlight/${highlightId}/`);
    } catch (error) {
      console.error('Error deleting highlight:', error);
      throw error;
    }
  },

  // Course operations
  addCourse: async (course: Omit<Course, 'id'>): Promise<Course> => {
    try {
      const response = await apiClient.post<any>('/alumni/add_my_course/', course);
      const transformed = transformBackendToFrontend(response);
      
      // Return the newly added course
      return transformed.courses[transformed.courses.length - 1];
    } catch (error) {
      console.error('Error adding course:', error);
      throw error;
    }
  },

  updateCourse: async (course: Course): Promise<Course> => {
    try {
      const response = await apiClient.put<any>(`/alumni/update-my-course/${course.id}/`, course);
      const transformed = transformBackendToFrontend(response);
      
      // Find and return the updated course
      const updatedCourse = transformed.courses.find(c => c.id === course.id);
      return updatedCourse || course;
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    try {
      await apiClient.delete(`/alumni/delete-my-course/${courseId}/`);
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  },
};

// Helper function to transform backend data to frontend format
function transformBackendToFrontend(backendData: any): AlumniProfile {
  const student = backendData.student;
  
  // Map support category from backend to frontend
  const supportStatusMap: Record<string, SupportStatus> = {
    'receiving_support': 'needSupport',
    'needs_extra_support': 'needExtraSupport',
    'no_support_needed': 'noSupportNeeded',
  };
  
  // Transform career history
  const careers: CareerEntry[] = (backendData.careerHistory || []).map((career: any) => ({
    id: career.id || String(Math.random()),
    type: career.positionType as CareerType,
    position: career.positionTitle || '',
    company: career.organizationName || '',
    location: career.location || '',
    startDate: toMonthValue(career.startDate),
    endDate: toMonthValue(career.endDate),
    current: career.isCurrent || false,
    description: career.description || '',
    achievements: [], // Not stored in backend yet
    salary: career.salary,
    degree: career.degree,
    field: career.field,
    institution: career.institution,
    businessName: career.businessName,
    businessType: career.businessType,
    otherType: career.otherType,
  }));
  
  // Transform skills
  const skills: Skill[] = (backendData.skills || []).map((skill: any) => ({
    id: skill.id || String(Math.random()),
    name: skill.name || '',
    category: skill.category as SkillCategory,
    proficiency: skill.proficiency || 0,
  }));
  
  // Transform highlights
  const highlights: CareerHighlight[] = (backendData.highlights || []).map((highlight: any) => ({
    id: highlight.id || String(Math.random()),
    title: highlight.title || '',
    description: highlight.description || '',
    date: highlight.date || '',
    type: highlight.type as HighlightType,
  }));
  
  // Transform courses
  const courses: Course[] = (backendData.courses || []).map((course: any) => ({
    id: course.id || String(Math.random()),
    name: course.name || '',
    provider: course.provider || '',
    status: course.status as CourseStatus,
    completionDate: course.completionDate,
    certificateId: course.certificateId,
    certificateUrl: course.certificateUrl,
    description: course.description,
  }));
  
  // Get current position info
  const currentPosition = backendData.currentPosition || {};
  
  // Get location from student's present address
  let location = '';
  if (student.presentAddress) {
    if (typeof student.presentAddress === 'string') {
      location = student.presentAddress;
    } else if (student.presentAddress.district) {
      location = student.presentAddress.district;
    }
  }
  
  return {
    id: student.id,
    name: student.fullNameEnglish || student.full_name_english || '',
    roll: student.currentRollNumber || student.current_roll_number || '',
    department: student.department?.name || '',
    graduationYear: backendData.graduationYear?.toString() || '',
    email: student.email || '',
    phone: student.mobileStudent || student.mobile_student || '',
    currentJob: currentPosition.positionTitle || currentPosition.position || '',
    company: currentPosition.organizationName || currentPosition.company || '',
    location: location,
    gpa: getStudentCgpa(student),
    avatar: student.profilePhoto || student.profile_photo || '',
    category: backendData.alumniType || 'recent',
    supportStatus: supportStatusMap[backendData.currentSupportCategory] || 'noSupportNeeded',
    higherStudiesInstitute: currentPosition.institution || '',
    businessName: currentPosition.businessName || '',
    careers,
    skills,
    highlights,
    courses,
    bio: backendData.bio || '',
    linkedin: backendData.linkedinUrl || backendData.linkedin_url || '',
    portfolio: backendData.portfolioUrl || backendData.portfolio_url || '',
  };
}
