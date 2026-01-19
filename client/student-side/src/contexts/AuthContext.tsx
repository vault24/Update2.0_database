import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

export type UserRole = 'student' | 'captain' | 'teacher';
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
    semester: 4,
    role: 'student',
    relatedProfileId: 'demo-student-001',
  },
  captain: {
    id: 'demo-captain-001',
    name: 'Fatima Khan',
    email: 'captain@demo.com',
    studentId: 'SPI-2024-0002',
    admissionStatus: 'approved',
    department: 'Computer Technology',
    semester: 4,
    role: 'captain',
    relatedProfileId: 'demo-captain-001',
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
          setUser({
            id: response.user.id,
            name: response.user.first_name && response.user.last_name 
              ? `${response.user.first_name} ${response.user.last_name}` 
              : response.user.username,
            email: response.user.email,
            studentId: response.user.related_profile_id || response.user.id,
            role: response.user.role || 'student',
            admissionStatus: response.user.admission_status || 'not_started',
            relatedProfileId: response.user.related_profile_id,
          });
        }
      } catch (error) {
        localStorage.removeItem('userId');
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
      
      setUser({
        id: response.user.id,
        name: response.user.first_name && response.user.last_name 
          ? `${response.user.first_name} ${response.user.last_name}` 
          : response.user.username,
        email: response.user.email,
        studentId: response.user.related_profile_id || response.user.id,
        role: response.user.role || 'student',
        admissionStatus: response.user.admission_status || 'not_started',
        relatedProfileId: response.user.related_profile_id,
      });
      
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
        password_confirm: data.password,
        first_name: firstName,
        last_name: lastName,
        mobile_number: data.mobile,
        role: data.role,
      };
      
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
        
        setUser({
          id: response.user.id,
          name: data.fullName,
          email: data.email,
          studentId: response.user.related_profile_id || response.user.id,
          role: data.role,
          admissionStatus: response.user.admission_status || 'not_started',
          relatedProfileId: response.user.related_profile_id,
        });
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
