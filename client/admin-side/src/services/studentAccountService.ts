/**
 * Student Portal account management (admin-only).
 * All write operations require the admin's own password for confirmation.
 */
import { apiClient } from '@/lib/api';

export interface PendingDeletion {
  scheduled: boolean;
  requested_at?: string | null;
  purge_at?: string | null;
}

export interface StudentAccount {
  has_account: boolean;
  user_id?: string;
  username?: string;
  email?: string;
  role?: string;
  /** Human label for the account type: 'Student' | 'Alumni' | 'Captain'. */
  account_type?: string;
  is_alumni_account?: boolean;
  account_status?: string;
  is_active?: boolean;
  student_id?: string;
  created_at?: string | null;
  last_login?: string | null;
  /** Soft-delete status — present whether or not a portal login exists. */
  pending_deletion?: PendingDeletion;
}

export interface ScheduleDeleteResponse {
  scheduled: true;
  purge_at: string;
  recovery_days: number;
  message: string;
}

export interface CreateAccountPayload {
  email: string;
  password: string;
  admin_password: string;
}

export interface UpdateAccountPayload {
  email?: string;
  is_active?: boolean;
  password?: string;
  admin_password: string;
}

export interface SendDeleteOtpPayload {
  // no body needed — session auth is sufficient
}

export interface DeleteAccountPayload {
  otp: string;
}

/** Extract a clean, user-friendly message from a thrown API error. */
export function accountErrorMessage(err: any): string {
  return (
    err?.detail ||
    err?.error ||
    err?.details ||
    err?.message ||
    'Something went wrong. Please try again.'
  );
}

export const studentAccountService = {
  get: (studentId: string) =>
    apiClient.get<StudentAccount>(`/students/${studentId}/account/`),

  create: (studentId: string, data: CreateAccountPayload) =>
    apiClient.post<StudentAccount>(`/students/${studentId}/account/`, data),

  update: (studentId: string, data: UpdateAccountPayload) =>
    apiClient.patch<StudentAccount>(`/students/${studentId}/account/`, data),

  sendDeleteOtp: (studentId: string, data: SendDeleteOtpPayload) =>
    apiClient.post<{ message: string; email: string }>(
      `/students/${studentId}/account/send-delete-otp/`,
      data,
    ),

  /** Schedule a soft-delete (7-day recovery window) — does NOT purge immediately. */
  deleteAccount: (studentId: string, data: DeleteAccountPayload) =>
    apiClient.delete<ScheduleDeleteResponse>(
      `/students/${studentId}/account/delete/`,
      { data },
    ),

  /** Admin: cancel a pending deletion and restore the account. */
  cancelDelete: (studentId: string) =>
    apiClient.post<{ cancelled: true; message: string }>(
      `/students/${studentId}/account/cancel-delete/`,
      {},
    ),
};

export default studentAccountService;
