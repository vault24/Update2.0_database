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

/**
 * Extract the most meaningful message from an API error.
 * The API client throws the parsed response body, which for these endpoints is
 * `{ success, message, errors? }`. Older paths may use `error`. Fall back to a
 * generic message only when nothing usable is present.
 */
function extractErrorMessage(error: any, fallback: string): string {
  if (error && typeof error === 'object') {
    if (typeof error.message === 'string' && error.message) return error.message;
    if (typeof error.error === 'string' && error.error) return error.error;
    if (error.errors && typeof error.errors === 'object') {
      const first = Object.values(error.errors)[0];
      if (Array.isArray(first) && first.length) return String(first[0]);
      if (typeof first === 'string') return first;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

class PasswordResetService {
  private baseUrl = '/auth/admin/password-reset';

  async requestPasswordReset(data: PasswordResetRequestData): Promise<PasswordResetResponse> {
    try {
      return await apiClient.post<PasswordResetResponse>(`${this.baseUrl}/request/`, data);
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to send password reset email'));
    }
  }

  async verifyOTP(data: OTPVerificationData): Promise<OTPVerificationResponse> {
    try {
      return await apiClient.post<OTPVerificationResponse>(`${this.baseUrl}/verify/`, data);
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Invalid OTP code'));
    }
  }

  async confirmPasswordReset(data: PasswordResetConfirmData): Promise<PasswordResetConfirmResponse> {
    try {
      return await apiClient.post<PasswordResetConfirmResponse>(`${this.baseUrl}/confirm/`, data);
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to reset password'));
    }
  }
}

export const passwordResetService = new PasswordResetService();