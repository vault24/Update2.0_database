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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for testing without password
const DEMO_USER: User = {
  id: 'demo-user-001',
  username: 'demo_admin',
  email: 'demo@sipi.edu.bd',
  first_name: 'Demo',
  last_name: 'Admin',
  role: 'registrar',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      // Check if user is authenticated by calling /api/auth/me/
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.me}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data;
        
        // Only allow admin roles (registrar, institute_head) to access admin-side
        const allowedRoles = ['registrar', 'institute_head'];
        if (userData && !allowedRoles.includes(userData.role)) {
          // User is authenticated but not an admin - clear user and logout
          setUser(null);
          // Logout from backend
          try {
            await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.logout}`, {
              method: 'POST',
              credentials: 'include',
            });
          } catch (e) {
            // Ignore logout errors
          }
          return;
        }
        
        setUser(userData);
      } else if (response.status === 403 || response.status === 401) {
        // 403/401 is expected when user is not authenticated - silently handle it
        setUser(null);
      } else {
        // Other errors should be logged
        console.error('Auth check failed with status:', response.status);
        setUser(null);
      }
    } catch (error) {
      // Network errors or other exceptions
      // Only log if it's not a 403/401 (which might be caught as network error in some cases)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Network error - might be CORS or server down, but don't spam console
        setUser(null);
      } else {
        console.error('Auth check failed:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
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
      }).catch(() => {}); // Ignore error, just need the cookie

      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ username: email, password, remember_me: rememberMe }), // Backend expects 'username' field
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
      const user = userData.user || userData;
      
      // Only allow admin roles (registrar, institute_head) to access admin-side
      const allowedRoles = ['registrar', 'institute_head'];
      if (!allowedRoles.includes(user.role)) {
        // Logout from backend
        try {
          await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.logout}`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (e) {
          // Ignore logout errors
        }
        throw new Error('Access denied. This account is only for student-side access. Please use the student portal to login.');
      }
      
      setUser(user);
      navigate('/');
    } catch (error) {
      throw error;
    }
  };

  // Demo login - no password required
  const loginAsDemo = () => {
    setUser(DEMO_USER);
    setIsDemoMode(true);
    navigate('/');
  };

  const logout = async () => {
    // If in demo mode, just clear user without API call
    if (isDemoMode) {
      setUser(null);
      setIsDemoMode(false);
      navigate('/auth');
      return;
    }
    
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {};
      
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsDemo,
        logout,
        checkAuth,
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
