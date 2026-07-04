/**
 * Settings Service
 * Handles API requests for system settings management
 */

import { apiClient } from '@/lib/api';

// Types
export interface SystemSettings {
  id: string;
  current_academic_year: string;
  current_semester: number;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  admin_notification_email: string;
  allow_student_registration: boolean;
  allow_teacher_registration: boolean;
  allow_admission_submission: boolean;
  institute_name: string;
  institute_address: string;
  institute_phone: string;
  institute_email: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_notice_enabled: boolean;
  maintenance_notice_text: string;
  institute_logo?: string | null;
  updated_at: string;
  updated_by?: string;
  updated_by_name?: string;
}

export interface SystemSettingsUpdateData {
  current_academic_year?: string;
  current_semester?: number;
  enable_email_notifications?: boolean;
  enable_sms_notifications?: boolean;
  admin_notification_email?: string;
  allow_student_registration?: boolean;
  allow_teacher_registration?: boolean;
  allow_admission_submission?: boolean;
  institute_name?: string;
  institute_address?: string;
  institute_phone?: string;
  institute_email?: string;
  maintenance_mode?: boolean;
  maintenance_message?: string;
  maintenance_notice_enabled?: boolean;
  maintenance_notice_text?: string;
}

// Service
export const settingsService = {
  /**
   * Get current system settings
   */
  getSettings: async (): Promise<SystemSettings> => {
    return await apiClient.get<SystemSettings>('settings/');
  },

  /**
   * Update system settings
   */
  updateSettings: async (data: SystemSettingsUpdateData): Promise<SystemSettings> => {
    return await apiClient.put<SystemSettings>('settings/', data);
  },

  /**
   * Upload / replace the institute logo (multipart)
   */
  uploadLogo: async (file: File): Promise<SystemSettings> => {
    const formData = new FormData();
    formData.append('institute_logo', file);
    return await apiClient.put<SystemSettings>('settings/', formData);
  },
};
