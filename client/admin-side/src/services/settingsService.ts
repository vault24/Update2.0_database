/**
 * Settings Service
 * Handles API requests for system settings management
 */

import { apiClient } from '@/lib/api';

// Types
export interface SystemSettings {
  id: string;
  currentAcademicYear: string;
  currentSemester: number;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  adminNotificationEmail: string;
  allowStudentRegistration: boolean;
  allowTeacherRegistration: boolean;
  allowAdmissionSubmission: boolean;
  instituteName: string;
  instituteAddress: string;
  institutePhone: string;
  instituteEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface SystemSettingsUpdateData {
  currentAcademicYear?: string;
  currentSemester?: number;
  enableEmailNotifications?: boolean;
  enableSmsNotifications?: boolean;
  adminNotificationEmail?: string;
  allowStudentRegistration?: boolean;
  allowTeacherRegistration?: boolean;
  allowAdmissionSubmission?: boolean;
  instituteName?: string;
  instituteAddress?: string;
  institutePhone?: string;
  instituteEmail?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
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
