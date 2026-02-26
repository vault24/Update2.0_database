import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

export type UserRole = 'student' | 'captain' | 'teacher' | 'alumni';
export type AdmissionStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

interface User {
  id: string;
  name: string;
  email: string;
  studentId: string;
  avatarUrl?: string;
  admissionStatus: AdmissionStatus;
  department?: string;
  semester?: number;
  role: UserRole;
  relatedProfileId?: string;
  studentStatus?: string;
  isAlumni?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  demoLogin: (role: UserRole) => void;
  loading: boolean;
}

interface SignupData {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  role: UserRole;
  sscBoardRoll?: string; // For students and captains
  fullNameBangla?: string;
  designation?: string;
  department?: string;
  qualifications?: string[];
  specializations?: string[];
  officeLocation?: string;
}

// Demo users for testing without backend
const demoUsers: Record<UserRole, User> = {
  student: {
    id: 'demo-student-001',
    name: 'Rakib Ahmed',
    email: 'student@demo.com',
    studentId: 'SPI-2024-0001',
    admissionStatus: 'approved',
    department: 'Computer Technology',
    semester: 8, // Changed to 8 to test alumni profile functionality
    role: 'student',
    relatedProfileId: 'demo-student-001',
    studentStatus: 'graduated',
    isAlumni: true,
  },
  captain: {
    id: 'demo-captain-001',
    name: 'Fatima Khan',
    email: 'captain@demo.com',
    studentId: 'SPI-2024-0002',
    admissionStatus: 'approved',
    department: 'Computer Technology',
    semester: 6, // Regular semester for captain
    role: 'captain',
    relatedProfileId: 'demo-captain-001',
    studentStatus: 'active',
    isAlumni: false,
  },
  teacher: {
    id: 'demo-teacher-001',
    name: 'Dr. Kamal Hossain',
    email: 'teacher@demo.com',
    studentId: 'T-001',
    admissionStatus: 'approved',
    department: 'Computer Technology',
    role: 'teacher',
    relatedProfileId: 'demo-teacher-001',
    isAlumni: false,
  },
  alumni: {
    id: 'demo-alumni-001',
    name: 'Mohammad Rahim',
    email: 'alumni@demo.com',
    studentId: 'SPI-2020-0045',
    admissionStatus: 'approved',
    department: 'Computer Technology',
    role: 'alumni',
    relatedProfileId: 'demo-alumni-001',
    isAlumni: true,
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for demo user first
      const demoRole = localStorage.getItem('demoRole') as UserRole | null;
      if (demoRole && demoUsers[demoRole]) {
        setUser(demoUsers[demoRole]);
        setLoading(false);
        return;
      }

      const hasLoggedOut = localStorage.getItem('hasLoggedOut');
      if (hasLoggedOut === 'true') {
        setLoading(false);
        return;
      }

      try {
        await api.get<any>('/auth/csrf/');
        const response = await api.get<any>('/auth/me/');
        if (response.user) {
          localStorage.setItem('userId', response.user.id);
          
          // Ensure relatedProfileId is properly set
          const relatedProfileId = response.user.related_profile_id || response.user.student_profile_id || response.user.teacher_profile_id || response.user.id;
          
          // Try to get the full name from the profile
          let fullName = response.user.username; // Default to username (email)
          
          // Priority 1: If first_name and last_name are available in User model, use them
          if (response.user.first_name || response.user.last_name) {
            const firstName = response.user.first_name || '';
            const lastName = response.user.last_name || '';
            fullName = `${firstName} ${lastName}`.trim();
          } 
          // Priority 2: If no name in User model, try to fetch from profile
          else if (relatedProfileId && (response.user.role === 'student' || response.user.role === 'captain')) {
            // For students/captains, try to fetch the profile to get fullNameEnglish
            try {
              const profileResponse = await api.get<any>(`/students/${relatedProfileId}/`);
              if (profileResponse.full_name_english) {
                fullName = profileResponse.full_name_english;
              }
            } catch (profileError) {
              console.error('Failed to fetch student profile for name:', profileError);
            }
          } else if (relatedProfileId && response.user.role === 'teacher') {
            // For teachers, try to fetch the teacher profile
            try {
              const profileResponse = await api.get<any>(`/teachers/${relatedProfileId}/`);
              if (profileResponse.full_name_english) {
                fullName = profileResponse.full_name_english;
              }
            } catch (profileError) {
              console.error('Failed to fetch teacher profile for name:', profileError);
            }
          }
          
          setUser({
            id: response.user.id,
            name: fullName,
            email: response.user.email,
            studentId: response.user.student_id || response.user.id, // Use student_id field
            role: response.user.role || 'student',
            admissionStatus: response.user.admission_status || 'not_started',
            relatedProfileId: relatedProfileId,
            semester: response.user.semester,
            studentStatus: response.user.student_status,
            isAlumni: response.user.is_alumni,
          });
          
          // Store relatedProfileId in localStorage as backup
          localStorage.setItem('relatedProfileId', relatedProfileId);
        }
      } catch (error) {
        localStorage.removeItem('userId');
        localStorage.removeItem('relatedProfileId');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const demoLogin = (role: UserRole) => {
    localStorage.setItem('demoRole', role);
    localStorage.removeItem('hasLoggedOut');
    setUser(demoUsers[role]);
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      localStorage.removeItem('hasLoggedOut');
      localStorage.removeItem('demoRole');
      
      await api.get<any>('/auth/csrf/');
      const response = await api.post<any>('/auth/login/', { username: email, password, remember_me: rememberMe });
      
      if (response.user?.id) {
        localStorage.setItem('userId', response.user.id);
      }
      
      // Ensure relatedProfileId is properly set
      const relatedProfileId = response.user.related_profile_id || response.user.student_profile_id || response.user.teacher_profile_id || response.user.id;
      
      // Try to get the full name from the profile
      let fullName = response.user.username; // Default to username (email)
      
      // Priority 1: If first_name and last_name are available in User model, use them
      if (response.user.first_name || response.user.last_name) {
        const firstName = response.user.first_name || '';
        const lastName = response.user.last_name || '';
        fullName = `${firstName} ${lastName}`.trim();
      } 
      // Priority 2: If no name in User model, try to fetch from profile
      else if (relatedProfileId && (response.user.role === 'student' || response.user.role === 'captain')) {
        // For students/captains, try to fetch the profile to get fullNameEnglish
        try {
          const profileResponse = await api.get<any>(`/students/${relatedProfileId}/`);
          if (profileResponse.full_name_english) {
            fullName = profileResponse.full_name_english;
          }
        } catch (profileError) {
          console.error('Failed to fetch student profile for name:', profileError);
        }
      } else if (relatedProfileId && response.user.role === 'teacher') {
        // For teachers, try to fetch the teacher profile
        try {
          const profileResponse = await api.get<any>(`/teachers/${relatedProfileId}/`);
          if (profileResponse.full_name_english) {
            fullName = profileResponse.full_name_english;
          }
        } catch (profileError) {
          console.error('Failed to fetch teacher profile for name:', profileError);
        }
      }
      
      setUser({
        id: response.user.id,
        name: fullName,
        email: response.user.email,
        studentId: response.user.student_id || response.user.id, // Use student_id field
        role: response.user.role || 'student',
        admissionStatus: response.user.admission_status || 'not_started',
        relatedProfileId: relatedProfileId,
        semester: response.user.semester,
        studentStatus: response.user.student_status,
        isAlumni: response.user.is_alumni,
      });
      
      // Store relatedProfileId in localStorage as backup
      localStorage.setItem('relatedProfileId', relatedProfileId);
      
      if (response.redirect_to_admission) {
        console.log('User needs to complete admission');
      }
    } catch (error: any) {
      setUser(null);
      localStorage.removeItem('userId');
      localStorage.setItem('hasLoggedOut', 'true');
      
      try {
        await api.post('/auth/logout/', {});
      } catch (logoutError) {}
      
      if (
        error.response?.data?.code === 'pending_approval' ||
        error.response?.data?.message?.includes('pending approval') ||
        error.response?.data?.non_field_errors?.some((msg: string) => 
          msg.toLowerCase().includes('pending approval')
        )
      ) {
        const teacherError = new Error('TEACHER_PENDING_APPROVAL');
        teacherError.message = 
          error.response.data.message || 
          error.response.data.non_field_errors?.[0] ||
          'Your teacher account is pending approval. Please wait for admin approval.';
        throw teacherError;
      }
      
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signup = async (data: SignupData) => {
    try {
      localStorage.removeItem('hasLoggedOut');
      localStorage.removeItem('demoRole');
      
      await api.get<any>('/auth/csrf/');
      
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const registrationData: any = {
        username: data.email,
        email: data.email,
        password: data.password,
        confirm_password: data.password,
        first_name: firstName,
        last_name: lastName,
        mobile_number: data.mobile,
        role: data.role,
      };
      
      // Add SSC Board Roll for students and captains
      if ((data.role === 'student' || data.role === 'captain') && data.sscBoardRoll) {
        registrationData.ssc_board_roll = data.sscBoardRoll;
      }
      
      if (data.role === 'teacher') {
        registrationData.full_name_english = data.fullName;
        registrationData.full_name_bangla = data.fullNameBangla || '';
        registrationData.designation = data.designation || '';
        registrationData.department = data.department || '';
        registrationData.qualifications = data.qualifications || [];
        registrationData.specializations = data.specializations || [];
        registrationData.office_location = data.officeLocation || '';
      }
      
      const response = await api.post<any>('/auth/register/', registrationData);
      
      if (data.role === 'teacher') {
        return;
      }
      
      if (response.auto_logged_in && response.user) {
        localStorage.setItem('userId', response.user.id);
        
        // Ensure relatedProfileId is properly set
        const relatedProfileId = response.user.related_profile_id || response.user.student_profile_id || response.user.teacher_profile_id || response.user.id;
        
        setUser({
          id: response.user.id,
          name: data.fullName, // Use the fullName from signup form
          email: data.email,
          studentId: response.user.student_id || response.user.id, // Use student_id field
          role: data.role,
          admissionStatus: response.user.admission_status || 'not_started',
          relatedProfileId: relatedProfileId,
          semester: response.user.semester,
          studentStatus: response.user.student_status,
          isAlumni: response.user.is_alumni,
        });
        
        // Store relatedProfileId in localStorage as backup
        localStorage.setItem('relatedProfileId', relatedProfileId);
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.setItem('hasLoggedOut', 'true');
    localStorage.removeItem('demoRole');
    
    setUser(null);
    localStorage.removeItem('userId');
    
    try {
      await api.post('/auth/logout/', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      signup, 
      logout,
      demoLogin,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
