/**
 * Student Portal account management (admin-only).
 * All write operations require the admin's own password for confirmation.
 */
import { apiClient } from '@/lib/api';

export interface StudentAccount {
  has_account: boolean;
  user_id?: string;
  username?: string;
  email?: string;
  role?: string;
  account_status?: string;
  is_active?: boolean;
  student_id?: string;
  created_at?: string | null;
  last_login?: string | null;
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
};

export default studentAccountService;
