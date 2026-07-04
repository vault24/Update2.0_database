import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api, { setAuthErrorHandler } from '@/lib/api';

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
  /** True when the account was created via the "Alumni Account" signup option. */
  isAlumniAccount?: boolean;
  /** Review state of a submitted alumni application (null until submitted). */
  alumniReviewStatus?: 'pending' | 'approved' | 'rejected' | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  /** Step 1 of sign-up: validate data + email an OTP. No account is created yet. */
  requestSignupOtp: (data: SignupData) => Promise<void>;
  /** Step 2 of sign-up: verify the OTP and create the account. */
  signup: (data: SignupData, otp?: string) => Promise<void>;
  logout: () => void;
  /** Re-fetch the current user from the server (keeps admission status, profile id, role in sync). */
  refreshUser: () => Promise<void>;
  loading: boolean;
}

/** True when an API error represents an authentication failure (expired/invalid session). */
function isAuthFailure(error: any): boolean {
  const status = error?.status_code;
  return status === 401 || status === 403;
}

// Roles permitted on the STUDENT portal. Admin accounts (registrar,
// department_head, institute_head) and superusers must never be treated as
// authenticated here, even if a backend session exists (the session cookie is
// shared with the admin portal on the same backend host).
const STUDENT_PORTAL_ROLES = ['student', 'captain', 'teacher'];

function isStudentPortalUser(userData: any): boolean {
  return !!userData && STUDENT_PORTAL_ROLES.includes(userData.role);
}

interface SignupData {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  role: UserRole;
  sscBoardRoll?: string; // For students and captains
  shift?: string; // For captains ('Morning' | 'Day') — routes the request to the right Department Head
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

/** Build the app's User object from the backend `user` payload, resolving name + profile id. */
async function buildUserFromResponse(userData: any): Promise<User> {
  const relatedProfileId = await resolveRelatedProfileIdWithFallback(userData);

  // Try to get the full name from the profile.
  let fullName = userData.username; // Default to username (email)

  // Priority 1: first_name / last_name on the User model.
  if (userData.first_name || userData.last_name) {
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    fullName = `${firstName} ${lastName}`.trim();
  }
  // Priority 2: fall back to the linked profile's English name.
  else if (relatedProfileId) {
    if (userData.role === 'student' || userData.role === 'captain') {
      try {
        const profileResponse = await api.get<any>(`/students/${relatedProfileId}/`);
        if (profileResponse.full_name_english) {
          fullName = profileResponse.full_name_english;
        }
      } catch (profileError) {
        console.error('Failed to fetch student profile for name:', profileError);
      }
    } else if (userData.role === 'teacher') {
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

  return {
    id: userData.id,
    name: fullName,
    email: userData.email,
    studentId: userData.student_id || userData.id,
    role: userData.role || 'student',
    admissionStatus: userData.admission_status || 'not_started',
    relatedProfileId,
    semester: userData.semester,
    studentStatus: userData.student_status,
    isAlumni: userData.is_alumni,
    isAlumniAccount: userData.is_alumni_account,
    alumniReviewStatus: userData.alumni_review_status ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Guards against overlapping validations and against tearing down state for a
  // user who has already been logged out / replaced.
  const validatingRef = useRef(false);
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /** Persist a freshly built user into state + localStorage backups. */
  const applyUser = useCallback((built: User) => {
    setUser(built);
    if (built.id) {
      localStorage.setItem('userId', built.id);
    }
    if (built.relatedProfileId) {
      localStorage.setItem('relatedProfileId', built.relatedProfileId);
    } else {
      localStorage.removeItem('relatedProfileId');
    }
  }, []);

  /** Clear all client-side auth state (used when the session is gone). */
  const clearUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('relatedProfileId');
  }, []);

  /**
   * Validate the current session against the server and refresh the cached user.
   * - On success: updates state with the latest admission status / profile / role.
   * - On a genuine auth failure (401/403): signs the user out cleanly so the app
   *   redirects to login instead of getting stuck in a broken half-logged-in state.
   * - On a network/transient error: keeps the existing session untouched.
   */
  const validateSession = useCallback(async (): Promise<void> => {
    if (validatingRef.current) return;
    validatingRef.current = true;
    try {
      const response = await api.get<any>('/auth/me/');
      if (response.user) {
        // If the active session belongs to an admin/superuser, do not keep the
        // student app authenticated (shared backend session across portals).
        if (!isStudentPortalUser(response.user)) {
          if (userRef.current) clearUser();
          return;
        }
        const built = await buildUserFromResponse(response.user);
        // Avoid pointless re-renders of the whole app when nothing changed
        // (focus/poll validations are frequent).
        const current = userRef.current;
        const unchanged =
          current &&
          current.id === built.id &&
          current.role === built.role &&
          current.admissionStatus === built.admissionStatus &&
          current.relatedProfileId === built.relatedProfileId &&
          current.studentStatus === built.studentStatus &&
          current.isAlumni === built.isAlumni &&
          current.isAlumniAccount === built.isAlumniAccount &&
          current.alumniReviewStatus === built.alumniReviewStatus &&
          current.name === built.name &&
          current.studentId === built.studentId;
        if (!unchanged) {
          applyUser(built);
        }
      }
    } catch (error) {
      // Only tear down on a real authentication failure. Network blips, timeouts
      // or unrelated errors must NOT log the user out.
      if (isAuthFailure(error) && userRef.current) {
        clearUser();
      }
    } finally {
      validatingRef.current = false;
    }
  }, [applyUser, clearUser]);

  // Public refresh used by the auth-error handler and the focus/poll effects.
  const refreshUser = useCallback(async () => {
    await validateSession();
  }, [validateSession]);

  // Initial authentication check on mount.
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
          // Reject admin/superuser sessions on the student portal. We do NOT
          // log them out (that is their valid admin session) — we simply don't
          // treat them as authenticated here.
          if (!isStudentPortalUser(response.user)) {
            localStorage.removeItem('userId');
            localStorage.removeItem('relatedProfileId');
          } else {
            const built = await buildUserFromResponse(response.user);
            applyUser(built);
          }
        }
      } catch (error) {
        localStorage.removeItem('userId');
        localStorage.removeItem('relatedProfileId');
      }
      setLoading(false);
    };

    checkAuth();
  }, [applyUser]);

  // Keep auth state fresh and the session alive:
  //  - re-validate when the tab regains focus / becomes visible (covers waking
  //    from inactivity and returning after an admin changed your status), and
  //  - poll on an interval so an open-but-idle tab keeps the sliding session
  //    alive and picks up status changes without a manual refresh.
  useEffect(() => {
    if (!user) return;

    const onFocus = () => {
      void validateSession();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void validateSession();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => {
      void validateSession();
    }, 4 * 60 * 1000); // every 4 minutes

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [user, validateSession]);

  // Register the global auth-error handler so a 401/403 from any request
  // triggers a single re-validation (which only signs out if truly expired).
  useEffect(() => {
    setAuthErrorHandler(() => {
      if (userRef.current) {
        void validateSession();
      }
    });
    return () => setAuthErrorHandler(null);
  }, [validateSession]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      localStorage.removeItem('hasLoggedOut');
      
      await api.get<any>('/auth/csrf/');
      // `portal: 'student'` tells the backend to reject admin/superuser accounts.
      const response = await api.post<any>('/auth/login/', {
        username: email,
        password,
        remember_me: rememberMe,
        portal: 'student',
      });

      // Defense in depth: never authenticate a non-student account here even if
      // the backend ever returned one.
      if (!isStudentPortalUser(response.user)) {
        try { await api.post('/auth/logout/', {}); } catch (e) {}
        throw new Error('This account cannot sign in to the student portal.');
      }

      const built = await buildUserFromResponse(response.user);
      applyUser(built);

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

  // Build the backend registration payload shared by the OTP request and the
  // final account-creation call so both validate against identical data.
  const buildRegistrationData = (data: SignupData): Record<string, any> => {
    const nameParts = data.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const registrationData: Record<string, any> = {
      username: data.email,
      email: data.email,
      password: data.password,
      confirm_password: data.password,
      first_name: firstName,
      last_name: lastName,
      mobile_number: data.mobile,
      role: data.role,
    };

    // Alumni accounts register as a student-role account flagged as alumni.
    // The backend skips the SSC-roll / admission requirements for these.
    if (data.role === 'alumni') {
      registrationData.role = 'student';
      registrationData.account_type = 'alumni';
    }

    // SSC Board Roll for students and captains
    if ((data.role === 'student' || data.role === 'captain') && data.sscBoardRoll) {
      registrationData.ssc_board_roll = data.sscBoardRoll;
    }

    // Captains must say which department + shift they belong to so the request
    // is routed to the right Department Head.
    if (data.role === 'captain') {
      registrationData.department = data.department && data.department !== 'none' ? data.department : null;
      registrationData.shift = data.shift || '';
    }

    if (data.role === 'teacher') {
      registrationData.full_name_english = data.fullName;
      registrationData.full_name_bangla = data.fullNameBangla || '';
      registrationData.designation = data.designation || '';
      // Department is optional — '' / 'none' means "No department".
      registrationData.department =
        data.department && data.department !== 'none' ? data.department : null;
      registrationData.qualifications = data.qualifications || [];
      registrationData.specializations = data.specializations || [];
      registrationData.office_location = data.officeLocation || '';
    }

    return registrationData;
  };

  // Step 1: validate + email an OTP. No account is created yet.
  const requestSignupOtp = async (data: SignupData) => {
    localStorage.removeItem('hasLoggedOut');
    await api.get<any>('/auth/csrf/');
    await api.post<any>('/auth/register/send-otp/', buildRegistrationData(data));
  };

  // Step 2: verify the OTP and create the account.
  const signup = async (data: SignupData, otp?: string) => {
    try {
      localStorage.removeItem('hasLoggedOut');

      await api.get<any>('/auth/csrf/');

      const registrationData = buildRegistrationData(data);
      if (otp) {
        registrationData.otp = otp;
      }

      const response = await api.post<any>('/auth/register/', registrationData);

      if (data.role === 'teacher') {
        return;
      }

      if (response.auto_logged_in && response.user) {
        const built = await buildUserFromResponse(response.user);
        // Prefer the name the user just typed in the signup form.
        applyUser({ ...built, name: data.fullName || built.name });
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.setItem('hasLoggedOut', 'true');

    clearUser();

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
      requestSignupOtp,
      signup,
      logout,
      refreshUser,
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
