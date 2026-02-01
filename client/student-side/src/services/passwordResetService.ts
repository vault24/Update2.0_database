import api from '@/lib/api';

export interface PasswordResetRequestData {
  email: string;
}

export interface OTPVerificationData {
  email: string;
  otp: string;
}

export interface PasswordResetConfirmData {
  email: string;
  otp: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  remaining_attempts?: number;
}

export interface OTPVerificationResponse {
  success: boolean;
  message: string;
  verified?: boolean;
}

export interface PasswordResetConfirmResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

class PasswordResetService {
  private baseUrl = '/auth/students/password-reset';

  /**
   * Ensure CSRF token is available before making requests
   */
  private async ensureCSRFToken(): Promise<void> {
    // Check if we already have a CSRF token
    const existingToken = this.getCsrfToken();
    if (existingToken) {
      return; // Already have a token
    }

    // Get CSRF token
    try {
      await api.get('/auth/csrf/');
    } catch (error) {
      console.warn('Failed to get CSRF token:', error);
      // Continue anyway, the API client will handle it
    }
  }

  /**
   * Get CSRF token from cookies (same logic as API client)
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

  async requestPasswordReset(data: PasswordResetRequestData): Promise<PasswordResetResponse> {
    try {
      // Ensure we have a CSRF token before making the request
      await this.ensureCSRFToken();
      
      const response = await api.post<PasswordResetResponse>(`${this.baseUrl}/request/`, data);
      return response;
    } catch (error: any) {
      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error(error.error || 'Failed to send password reset email');
      }
      throw new Error('Network error. Please try again.');
    }
  }

  async verifyOTP(data: OTPVerificationData): Promise<OTPVerificationResponse> {
    try {
      // Ensure we have a CSRF token before making the request
      await this.ensureCSRFToken();
      
      const response = await api.post<OTPVerificationResponse>(`${this.baseUrl}/verify/`, data);
      return response;
    } catch (error: any) {
      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error(error.error || 'Invalid OTP code');
      }
      throw new Error('Network error. Please try again.');
    }
  }

  async confirmPasswordReset(data: PasswordResetConfirmData): Promise<PasswordResetConfirmResponse> {
    try {
      // Ensure we have a CSRF token before making the request
      await this.ensureCSRFToken();
      
      const response = await api.post<PasswordResetConfirmResponse>(`${this.baseUrl}/confirm/`, data);
      return response;
    } catch (error: any) {
      if (error && typeof error === 'object' && 'error' in error) {
        throw new Error(error.error || 'Failed to reset password');
      }
      throw new Error('Network error. Please try again.');
    }
  }
}

export const passwordResetService = new PasswordResetService();