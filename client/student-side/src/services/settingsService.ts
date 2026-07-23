import api from '@/lib/api';

export interface SystemSettings {
  id: string;
  current_academic_year: string;
  current_semester: number;
  institute_name: string;
  institute_address: string;
  institute_phone: string;
  institute_email: string;
  maintenance_notice_enabled?: boolean;
  maintenance_notice_text?: string;
  updated_at: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
  };
}

export interface PublicProfileSetting {
  /** Effective visibility of the /student/<roll> public page. */
  enabled: boolean;
  /** The stored explicit choice; null = using the gender-based default. */
  explicit: boolean | null;
  /** What the default is for this account (off for female students). */
  default_enabled: boolean;
  /** True for female accounts — photo is never shown publicly. */
  photo_hidden: boolean;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UpdateAccountData {
  email?: string;
  first_name?: string;
  last_name?: string;
}

class SettingsService {
  /**
   * Get system settings (public endpoint)
   */
  async getSystemSettings(): Promise<SystemSettings> {
    const response = await api.get<SystemSettings>('/settings/');
    return response;
  }

  /**
   * The logged-in student's public-profile visibility (server-enforced).
   * `enabled` is the effective value; `explicit` is null until the student
   * makes a choice (defaults: on, except female accounts which default off).
   * `photo_hidden` is true for female accounts — their photo is never shown
   * publicly regardless of this toggle.
   */
  async getPublicProfileSetting(): Promise<PublicProfileSetting> {
    return await api.get<PublicProfileSetting>('/students/public-profile-setting/');
  }

  async updatePublicProfileSetting(enabled: boolean): Promise<PublicProfileSetting> {
    return await api.patch<PublicProfileSetting>('/students/public-profile-setting/', { enabled });
  }

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/change-password/', data);
    return response;
  }

  /**
   * Update account details
   */
  async updateAccount(data: UpdateAccountData): Promise<any> {
    const response = await api.put<any>('/auth/profile/', data);
    return response;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    // This would need a backend endpoint
    // For now, return from localStorage
    const stored = localStorage.getItem('userPreferences');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Default preferences
    return {
      notifications: {
        email: true,
        push: true,
      },
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    // This would need a backend endpoint
    // For now, store in localStorage
    const current = await this.getPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem('userPreferences', JSON.stringify(updated));
    return updated;
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices(): Promise<{ message: string }> {
    // This would need a backend endpoint to invalidate all sessions
    // For now, just logout from current device
    const response = await api.post<{ message: string }>('/auth/logout/', {});
    return response;
  }

}

export const settingsService = new SettingsService();
