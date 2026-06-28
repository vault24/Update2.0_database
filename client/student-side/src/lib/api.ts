/**
 * API Client
 * Handles all HTTP requests to the backend API
 */

import { API_BASE_URL, REQUEST_TIMEOUT } from '@/config/api';

// Types
export interface ApiError {
  error: string;
  details?: string;
  field_errors?: Record<string, string[]>;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Auth-error handling
 *
 * When the backend rejects a request with 401/403 it may mean the session has
 * expired. We notify a single registered handler (the AuthProvider) so it can
 * re-validate the session against /auth/me/ and, only if that also fails, sign
 * the user out cleanly. This avoids the "broken half-logged-in" state where the
 * page is shown but every API call silently fails.
 *
 * Requests that are part of the auth flow itself are excluded so we never loop.
 */
type AuthErrorHandler = (status: number, endpoint: string) => void;
let authErrorHandler: AuthErrorHandler | null = null;

export function setAuthErrorHandler(handler: AuthErrorHandler | null): void {
  authErrorHandler = handler;
}

// Endpoints that are part of the auth flow — a 401/403 here must NOT trigger
// the global session-expiry path (login uses 400 for bad creds; /auth/me/ is
// how we validate, so reacting to its own failure would loop).
const AUTH_FLOW_ENDPOINTS = ['/auth/me/', '/auth/csrf/', '/auth/login/', '/auth/logout/', '/auth/register/'];

function isAuthFlowEndpoint(endpoint: string): boolean {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return AUTH_FLOW_ENDPOINTS.some((e) => path.startsWith(e));
}

function notifyAuthError(status: number, endpoint: string): void {
  if (!authErrorHandler) return;
  if (isAuthFlowEndpoint(endpoint)) return;
  try {
    authErrorHandler(status, endpoint);
  } catch {
    // Never let the handler break the original request flow.
  }
}

// API Client class
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = REQUEST_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Build full URL from endpoint
   */
  private buildURL(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response, endpoint: string = ''): Promise<T> {
    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      // Always expose the HTTP status so callers can reliably detect auth
      // failures (401/403) instead of guessing from the message body.
      errorData.status_code = response.status;

      // Surface possible session expiry to the AuthProvider.
      if (response.status === 401 || response.status === 403) {
        notifyAuthError(response.status, endpoint);
      }

      throw errorData;
    }

    if (response.status === 204) {
      return {} as T;
    }

    try {
      return await response.json();
    } catch {
      throw {
        error: 'Failed to parse response',
        details: 'The server returned an invalid response',
      } as ApiError;
    }
  }

  /**
   * Get CSRF token from cookies
   */
  private getCsrfToken(): string | null {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith(name + '=')) {
        return trimmed.substring(name.length + 1);
      }
    }
    return null;
  }

  /**
   * Get auth headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add CSRF token for session-based auth
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    return headers;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(this.buildURL(endpoint));

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        signal: controller.signal,
      });

      return await this.handleResponse<T>(response, endpoint);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          error: 'Request timeout',
          details: 'The request took too long to complete',
        } as ApiError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, isFormData: boolean = false): Promise<T> {
    const url = this.buildURL(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let headers: HeadersInit;
    let body: any;

    if (isFormData) {
      // For FormData, don't set Content-Type (browser will set it with boundary)
      // But still include CSRF token
      headers = {};
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      body = data;
    } else {
      headers = this.getAuthHeaders();
      body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        credentials: 'include',
        signal: controller.signal,
      });

      return await this.handleResponse<T>(response, endpoint);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          error: 'Request timeout',
          details: 'The request took too long to complete',
        } as ApiError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildURL(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
        signal: controller.signal,
      });

      return await this.handleResponse<T>(response, endpoint);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          error: 'Request timeout',
          details: 'The request took too long to complete',
        } as ApiError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildURL(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
        signal: controller.signal,
      });

      return await this.handleResponse<T>(response, endpoint);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          error: 'Request timeout',
          details: 'The request took too long to complete',
        } as ApiError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = this.buildURL(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        signal: controller.signal,
      });

      return await this.handleResponse<T>(response, endpoint);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          error: 'Request timeout',
          details: 'The request took too long to complete',
        } as ApiError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export singleton instance
const api = new ApiClient();
export const apiClient = api;
export default api;

// Export helper function for handling API errors
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const apiError = error as ApiError;
    
    // Handle validation errors with details object
    if (apiError.details && typeof apiError.details === 'object') {
      try {
        const detailsStr = JSON.stringify(apiError.details, null, 2);
        return `${apiError.error}: ${detailsStr}`;
      } catch {
        return apiError.error;
      }
    }
    
    // Handle field errors
    if (apiError.field_errors) {
      const fieldErrors = Object.entries(apiError.field_errors)
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
        .join('; ');
      return `${apiError.error}: ${fieldErrors}`;
    }
    
    return apiError.details || apiError.error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
