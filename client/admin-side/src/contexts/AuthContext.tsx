import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_superuser?: boolean;
  interface_mode?: 'simple' | 'advanced';
  /** Sidebar visibility of the Alumni pages (Settings -> Appearance). */
  alumni_visible?: boolean;
  department?: string | null;
  department_name?: string | null;
  /** Shift managed by a Department Head ('1st_shift' | '2nd_shift' | ''). */
  shift?: string;
}

export interface LoginResult {
  twoFactorRequired?: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  verify2FA: (email: string, otp: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

// The admin panel supports exactly three roles. `institute_head` is the
// Principal (super user), plus Department Head and Registrar.
const ADMIN_ROLES = ['institute_head', 'department_head', 'registrar'];

// Sent with every auth request so the backend keeps the admin session in its
// own cookie — logging in here never logs the student portal out.
const PORTAL_HEADER = { 'X-Portal': 'admin' } as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = async () => {
    // Resilient session check. A logged-in user must ONLY be signed out on a
    // definitive 401/403 from the server. Transient failures (network blip,
    // 5xx, proxy hiccup) are retried so a valid session is never dropped just
    // because a single /auth/me request failed after a refresh.
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.me}`, {
          credentials: 'include',
          headers: PORTAL_HEADER,
        });

        if (response.ok) {
          const data = await response.json();
          const userData = data.user || data;

          // Only allow the three admin roles to access admin-side.
          if (userData && !ADMIN_ROLES.includes(userData.role)) {
            setUser(null);
            try {
              await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.logout}`, {
                method: 'POST',
                credentials: 'include',
                headers: PORTAL_HEADER,
              });
            } catch {
              // Ignore logout errors.
            }
          } else {
            setUser(userData);
          }
          setIsLoading(false);
          return;
        }

        // Definitive "not authenticated" — stop and clear.
        if (response.status === 401 || response.status === 403) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Any other status (5xx, etc.) is treated as transient → retry below.
        console.warn(`Auth check attempt ${attempt} got status ${response.status}; retrying.`);
      } catch {
        // Network error → transient → retry below.
        console.warn(`Auth check attempt ${attempt} failed (network); retrying.`);
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }

    // Every attempt hit a transient error (server unreachable / 5xx). Do NOT
    // forcibly clear a possibly-valid session — just stop the loader. A valid
    // cookie will authenticate on the next successful check.
    setIsLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const getCsrfToken = (): string | null => {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith(name + '=')) {
        return trimmed.substring(name.length + 1);
      }
    }
    return null;
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Get CSRF token first from the dedicated endpoint
      await fetch(`${API_BASE_URL}/auth/csrf/`, {
        credentials: 'include',
        headers: PORTAL_HEADER,
      }).catch(() => {}); // Ignore error, just need the cookie

      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...PORTAL_HEADER,
      };

      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ username: email, password, remember_me: rememberMe, portal: 'admin' }), // Backend expects 'username' field; portal keeps student accounts out
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        let errorDetails: any = null;
        
        // Check content type to determine if response is JSON or HTML
        const contentType = response.headers.get('content-type');
        const isJSON = contentType && contentType.includes('application/json');
        
        try {
          if (isJSON) {
            const error = await response.json();
            errorDetails = error;
            errorMessage = error.detail || error.message || error.error || error.details || JSON.stringify(error);
            console.error('Login error response (JSON):', error);
          } else {
            // Response is HTML (likely Django error page)
            const text = await response.text();
            console.error('Login error response (HTML):', text.substring(0, 500));
            
            // Try to extract meaningful error from HTML
            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            const h1Match = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
            
            if (titleMatch) {
              errorMessage = `Server error: ${titleMatch[1]}`;
            } else if (h1Match) {
              errorMessage = `Server error: ${h1Match[1]}`;
            } else {
              errorMessage = `Server returned HTML error page (status ${response.status}). Check server logs.`;
            }
            
            // If it's a 400 error with HTML, it's likely a CSRF or middleware issue
            if (response.status === 400) {
              errorMessage = 'Bad request. This may be a CSRF token or CORS issue. Please check server configuration.';
            }
          }
        } catch (e) {
          errorMessage = `Login failed with status ${response.status}`;
          console.error('Error parsing response:', e);
        }
        
        // Create error with full details
        const error = new Error(errorMessage);
        (error as any).details = errorDetails;
        (error as any).status = response.status;
        throw error;
      }

      const userData = await response.json();

      // Two-factor enabled: backend deferred the login until the emailed
      // OTP code is verified. Surface that to the login page.
      if (userData.two_factor_required) {
        return { twoFactorRequired: true, email: userData.email };
      }

      await finalizeLogin(userData);
      return {};
    } catch (error) {
      throw error;
    }
  };

  // Shared post-authentication handling: enforce admin-only access, set the
  // user, and navigate into the panel.
  const finalizeLogin = async (userData: any) => {
    const user = userData.user || userData;

    // Only allow the three admin roles to access admin-side
    if (!ADMIN_ROLES.includes(user.role)) {
      try {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.logout}`, {
          method: 'POST',
          credentials: 'include',
          headers: PORTAL_HEADER,
        });
      } catch (e) {
        // Ignore logout errors
      }
      throw new Error('Access denied. This account is only for student-side access. Please use the student portal to login.');
    }

    setUser(user);
    navigate('/');
  };

  const verify2FA = async (email: string, otp: string, rememberMe: boolean = false) => {
    await fetch(`${API_BASE_URL}/auth/csrf/`, { credentials: 'include', headers: PORTAL_HEADER }).catch(() => {});
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...PORTAL_HEADER };
    if (csrfToken) headers['X-CSRFToken'] = csrfToken;

    const response = await fetch(`${API_BASE_URL}/auth/login/verify-2fa/`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ email, otp, remember_me: rememberMe, portal: 'admin' }),
    });

    if (!response.ok) {
      let message = 'Verification failed';
      try {
        const err = await response.json();
        message = err.message || err.detail || err.error || message;
      } catch {
        // keep default
      }
      throw new Error(message);
    }

    const userData = await response.json();
    await finalizeLogin(userData);
  };

  const logout = async () => {
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { ...PORTAL_HEADER };

      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.logout}`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      navigate('/auth');
    }
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verify2FA,
        logout,
        checkAuth,
        updateUser,
      }}
    >
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
