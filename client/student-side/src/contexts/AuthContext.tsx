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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const resolveRelatedProfileId = (userData: any): string | undefined => {
  const profileId =
    userData?.related_profile_id ||
    userData?.student_profile_id ||
    userData?.teacher_profile_id;

  if (profileId) {
    return String(profileId);
  }

  // Never fall back to auth user ID for teachers; teacher APIs require teacher profile UUID.
  if (userData?.role === 'teacher') {
    return undefined;
  }

  return userData?.id ? String(userData.id) : undefined;
};

const resolveTeacherProfileIdByEmail = async (email?: string): Promise<string | undefined> => {
  if (!email) {
    return undefined;
  }

  try {
    const response = await api.get<any>('/teachers/', { search: email, page_size: 100 });
    const teachers = Array.isArray(response)
      ? response
      : Array.isArray(response?.results)
      ? response.results
      : [];

    if (!teachers.length) {
      return undefined;
    }

    const exactEmailMatch = teachers.find(
      (teacher: any) =>
        typeof teacher?.email === 'string' &&
        teacher.email.toLowerCase() === email.toLowerCase()
    );

    const selectedTeacher = exactEmailMatch || (teachers.length === 1 ? teachers[0] : undefined);
    return selectedTeacher?.id ? String(selectedTeacher.id) : undefined;
  } catch {
    return undefined;
  }
};

const resolveRelatedProfileIdWithFallback = async (userData: any): Promise<string | undefined> => {
  const relatedProfileId = resolveRelatedProfileId(userData);
  if (relatedProfileId) {
    return relatedProfileId;
  }

  if (userData?.role === 'teacher') {
    return await resolveTeacherProfileIdByEmail(userData?.email);
  }

  return undefined;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
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
          const relatedProfileId = await resolveRelatedProfileIdWithFallback(response.user);
          
          // Try to get the full name from the profile
          let fullName = response.user.username; // Default to username (email)
          
          // Priority 1: If first_name and last_name are available in User model, use them
          if (response.user.first_name || response.user.last_name) {
            const firstName = response.user.first_name || '';
            const lastName = response.user.last_name || '';
            fullName = `${firstName} ${lastName}`.trim();
          } 
          // Priority 2: If no name in User model, try to fetch from profile
          else if (relatedProfileId) {
            if (response.user.role === 'student' || response.user.role === 'captain') {
              // For students/captains, try to fetch the profile to get fullNameEnglish
              try {
                const profileResponse = await api.get<any>(`/students/${relatedProfileId}/`);
                if (profileResponse.full_name_english) {
                  fullName = profileResponse.full_name_english;
                }
              } catch (profileError) {
                console.error('Failed to fetch student profile for name:', profileError);
              }
            } else if (response.user.role === 'teacher') {
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
          if (relatedProfileId) {
            localStorage.setItem('relatedProfileId', relatedProfileId);
          } else {
            localStorage.removeItem('relatedProfileId');
          }
        }
      } catch (error) {
        localStorage.removeItem('userId');
        localStorage.removeItem('relatedProfileId');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      localStorage.removeItem('hasLoggedOut');
      
      await api.get<any>('/auth/csrf/');
      const response = await api.post<any>('/auth/login/', { username: email, password, remember_me: rememberMe });
      
      if (response.user?.id) {
        localStorage.setItem('userId', response.user.id);
      }
      
      // Ensure relatedProfileId is properly set
      const relatedProfileId = await resolveRelatedProfileIdWithFallback(response.user);
      
      // Try to get the full name from the profile
      let fullName = response.user.username; // Default to username (email)
      
      // Priority 1: If first_name and last_name are available in User model, use them
      if (response.user.first_name || response.user.last_name) {
        const firstName = response.user.first_name || '';
        const lastName = response.user.last_name || '';
        fullName = `${firstName} ${lastName}`.trim();
      } 
      // Priority 2: If no name in User model, try to fetch from profile
      else if (relatedProfileId) {
        if (response.user.role === 'student' || response.user.role === 'captain') {
          // For students/captains, try to fetch the profile to get fullNameEnglish
          try {
            const profileResponse = await api.get<any>(`/students/${relatedProfileId}/`);
            if (profileResponse.full_name_english) {
              fullName = profileResponse.full_name_english;
            }
          } catch (profileError) {
            console.error('Failed to fetch student profile for name:', profileError);
          }
        } else if (response.user.role === 'teacher') {
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
      if (relatedProfileId) {
        localStorage.setItem('relatedProfileId', relatedProfileId);
      } else {
        localStorage.removeItem('relatedProfileId');
      }
      
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
        const relatedProfileId = await resolveRelatedProfileIdWithFallback(response.user);
        
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
        if (relatedProfileId) {
          localStorage.setItem('relatedProfileId', relatedProfileId);
        } else {
          localStorage.removeItem('relatedProfileId');
        }
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.setItem('hasLoggedOut', 'true');
    
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
