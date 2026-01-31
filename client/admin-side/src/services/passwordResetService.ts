import { apiClient } from '@/lib/api';

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
  private baseUrl = '/auth/admin/password-reset';

  async requestPasswordReset(data: PasswordResetRequestData): Promise<PasswordResetResponse> {
    try {
      const response = await apiClient.post<PasswordResetResponse>(`${this.baseUrl}/request/`, data);
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
      const response = await apiClient.post<OTPVerificationResponse>(`${this.baseUrl}/verify/`, data);
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
      const response = await apiClient.post<PasswordResetConfirmResponse>(`${this.baseUrl}/confirm/`, data);
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