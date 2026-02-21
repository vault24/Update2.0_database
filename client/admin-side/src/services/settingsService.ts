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
};
