// Alumni Service - Matching admin-side fields

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

// API functions (placeholder for future backend integration)
export const alumniService = {
  getProfile: async (id: string): Promise<AlumniProfile> => {
    // TODO: Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => resolve(demoAlumniProfile), 500);
    });
  },

  updateProfile: async (id: string, data: Partial<AlumniProfile>): Promise<AlumniProfile> => {
    // TODO: Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedProfile = { ...demoAlumniProfile, ...data };
        resolve(updatedProfile);
      }, 500);
    });
  },

  addCareer: async (alumniId: string, career: Omit<CareerEntry, 'id'>): Promise<CareerEntry> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...career, id: Date.now().toString() }), 500);
    });
  },

  updateCareer: async (alumniId: string, career: CareerEntry): Promise<CareerEntry> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(career), 500);
    });
  },

  deleteCareer: async (alumniId: string, careerId: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500);
    });
  },

  addSkill: async (alumniId: string, skill: Omit<Skill, 'id'>): Promise<Skill> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...skill, id: Date.now().toString() }), 500);
    });
  },

  updateSkill: async (alumniId: string, skill: Skill): Promise<Skill> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(skill), 500);
    });
  },

  deleteSkill: async (alumniId: string, skillId: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500);
    });
  },

  addHighlight: async (alumniId: string, highlight: Omit<CareerHighlight, 'id'>): Promise<CareerHighlight> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...highlight, id: Date.now().toString() }), 500);
    });
  },

  updateHighlight: async (alumniId: string, highlight: CareerHighlight): Promise<CareerHighlight> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(highlight), 500);
    });
  },

  deleteHighlight: async (alumniId: string, highlightId: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500);
    });
  },

  // Course operations
  addCourse: async (alumniId: string, course: Omit<Course, 'id'>): Promise<Course> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...course, id: Date.now().toString() }), 500);
    });
  },

  updateCourse: async (alumniId: string, course: Course): Promise<Course> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(course), 500);
    });
  },

  deleteCourse: async (alumniId: string, courseId: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500);
    });
  },
};
