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
  relatedProfileId?: string; // Links to Student or Teacher profile
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
  // Teacher-specific fields (optional)
  fullNameBangla?: string;
  designation?: string;
  department?: string;
  qualifications?: string[];
  specializations?: string[];
  officeLocation?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check if user explicitly logged out
      const hasLoggedOut = localStorage.getItem('hasLoggedOut');
      if (hasLoggedOut === 'true') {
        // User logged out, don't auto-login
        // Keep the flag until next successful login
        setLoading(false);
        return;
      }

      try {
        // First, ensure we have a CSRF token
        await api.get<any>('/auth/csrf/');
        
        // Try to get current user from session
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
        // No active session, clear storage
        localStorage.removeItem('userId');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Clear any logout flag
      localStorage.removeItem('hasLoggedOut');
      
      // First, ensure we have a CSRF token
      await api.get<any>('/auth/csrf/');
      
      // Backend expects 'username' field, not 'email'
      const response = await api.post<any>('/auth/login/', { username: email, password, remember_me: rememberMe });
      
      // Store user ID (no token in session-based auth)
      if (response.user?.id) {
        localStorage.setItem('userId', response.user.id);
      }
      
      // Set user data
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
      
      // Check if user needs to complete admission
      if (response.redirect_to_admission) {
        // Redirect will be handled by the component
        console.log('User needs to complete admission');
      }
    } catch (error: any) {
      // Login failed - clear any existing session to prevent auto-login on refresh
      setUser(null);
      localStorage.removeItem('userId');
      localStorage.setItem('hasLoggedOut', 'true');
      
      // Try to clear backend session if one exists
      try {
        await api.post('/auth/logout/', {});
      } catch (logoutError) {
        // Ignore logout errors
      }
      
      // Handle specific teacher pending approval error
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
      // Clear any logout flag
      localStorage.removeItem('hasLoggedOut');
      
      // First, ensure we have a CSRF token
      await api.get<any>('/auth/csrf/');
      
      // Split full name into first and last name
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Prepare registration payload
      const registrationData: any = {
        username: data.email, // Use email as username
        email: data.email,
        password: data.password,
        password_confirm: data.password, // Backend requires password confirmation
        first_name: firstName,
        last_name: lastName,
        mobile_number: data.mobile,
        role: data.role,
      };
      
      // Add teacher-specific fields if role is teacher
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
      
      // Handle teacher pending approval
      if (data.role === 'teacher') {
        // For teachers, don't set user data since they need approval
        // Just return success message
        return;
      }
      
      // Check if user was auto-logged in
      if (response.auto_logged_in && response.user) {
        // Store user ID for auto-logged in users
        localStorage.setItem('userId', response.user.id);
        
        // Set user data for auto-logged in users
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
    // Set logout flag to prevent auto-login on refresh
    localStorage.setItem('hasLoggedOut', 'true');
    
    // Clear local state first
    setUser(null);
    localStorage.removeItem('userId');
    
    // Then call backend logout to clear session
    try {
      await api.post('/auth/logout/', {});
    } catch (error) {
      console.error('Logout error:', error);
      // Even if backend logout fails, we've already cleared local state
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
