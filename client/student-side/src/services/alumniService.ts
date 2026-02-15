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

// Demo data for testing
export const demoAlumniProfile: AlumniProfile = {
  id: 'demo-alumni-001',
  name: 'Mohammad Rahim',
  roll: 'SPI-2020-0045',
  department: 'Computer Technology',
  graduationYear: '2024',
  email: 'rahim.alumni@example.com',
  phone: '+880 1712-345678',
  currentJob: 'Senior Software Engineer',
  company: 'Tech Solutions Ltd.',
  location: 'Dhaka, Bangladesh',
  gpa: 3.85,
  avatar: '',
  category: 'employed',
  supportStatus: 'noSupportNeeded',
  bio: 'Passionate software engineer with expertise in full-stack development. Graduated from Sirajganj Polytechnic Institute with honors. Currently working on innovative solutions in the fintech sector.',
  linkedin: 'https://linkedin.com/in/mohammad-rahim',
  portfolio: 'https://rahim-portfolio.dev',
  careers: [
    {
      id: '1',
      type: 'job',
      position: 'Senior Software Engineer',
      company: 'Tech Solutions Ltd.',
      location: 'Dhaka',
      startDate: '2024-06',
      current: true,
      description: 'Leading development of enterprise applications using React and Node.js',
      achievements: ['Led team of 5 developers', 'Reduced load time by 40%', 'Implemented CI/CD pipeline'],
      salary: '80,000 BDT',
    },
    {
      id: '2',
      type: 'job',
      position: 'Junior Developer',
      company: 'StartUp Hub',
      location: 'Dhaka',
      startDate: '2023-01',
      endDate: '2024-05',
      current: false,
      description: 'Worked on various web applications and mobile apps',
      achievements: ['Built 3 production apps', 'Mentored 2 interns'],
    },
    {
      id: '3',
      type: 'higherStudies',
      position: 'BSc in Computer Science',
      company: 'National University',
      location: 'Dhaka',
      startDate: '2024-09',
      current: true,
      description: 'Pursuing bachelor degree while working',
      degree: 'BSc',
      field: 'Computer Science',
      institution: 'National University',
    },
  ],
  skills: [
    { id: '1', name: 'React.js', category: 'technical', proficiency: 90 },
    { id: '2', name: 'Node.js', category: 'technical', proficiency: 85 },
    { id: '3', name: 'TypeScript', category: 'technical', proficiency: 80 },
    { id: '4', name: 'Python', category: 'technical', proficiency: 75 },
    { id: '5', name: 'Team Leadership', category: 'soft', proficiency: 85 },
    { id: '6', name: 'Communication', category: 'soft', proficiency: 90 },
    { id: '7', name: 'English', category: 'language', proficiency: 80 },
    { id: '8', name: 'Bengali', category: 'language', proficiency: 100 },
  ],
  highlights: [
    {
      id: '1',
      title: 'Best Graduate Award',
      description: 'Received the best graduate award from the department',
      date: '2024-03',
      type: 'award',
    },
    {
      id: '2',
      title: 'First Job Placement',
      description: 'Secured first job within 1 month of graduation',
      date: '2024-04',
      type: 'milestone',
    },
    {
      id: '3',
      title: 'E-commerce Platform Launch',
      description: 'Led the development and successful launch of a major e-commerce platform',
      date: '2024-08',
      type: 'project',
    },
  ],
  courses: [
    {
      id: '1',
      name: 'AWS Solutions Architect',
      provider: 'Amazon Web Services',
      status: 'completed' as CourseStatus,
      completionDate: '2024-06',
      certificateId: 'AWS-SAA-123456',
      certificateUrl: 'https://aws.amazon.com/verify/cert',
      description: 'Cloud architecture fundamentals and best practices',
    },
    {
      id: '2',
      name: 'React Advanced Patterns',
      provider: 'Frontend Masters',
      status: 'completed' as CourseStatus,
      completionDate: '2024-03',
      description: 'Advanced React patterns including hooks, context, and performance optimization',
    },
    {
      id: '3',
      name: 'Machine Learning Specialization',
      provider: 'Coursera',
      status: 'in_progress' as CourseStatus,
      description: 'Comprehensive ML course covering supervised and unsupervised learning',
    },
  ],
};

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
      // Transform frontend career data to backend format
      const backendData = {
        positionType: career.type,
        organizationName: career.company,
        positionTitle: career.position,
        startDate: career.startDate,
        endDate: career.endDate,
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
      
      const response = await apiClient.post<any>('/alumni/add_my_career/', backendData);
      const transformed = transformBackendToFrontend(response);
      
      // Return the newly added career
      return transformed.careers[transformed.careers.length - 1];
    } catch (error) {
      console.error('Error adding career:', error);
      throw error;
    }
  },

  updateCareer: async (career: CareerEntry): Promise<CareerEntry> => {
    try {
      const backendData = {
        positionType: career.type,
        organizationName: career.company,
        positionTitle: career.position,
        startDate: career.startDate,
        endDate: career.endDate,
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
    startDate: career.startDate || '',
    endDate: career.endDate,
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
    currentJob: currentPosition.positionTitle || '',
    company: currentPosition.organizationName || '',
    location: location,
    gpa: typeof student.gpa === 'number' ? student.gpa : parseFloat(student.gpa) || 0,
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
