import api from '@/lib/api';

export interface SystemSettings {
  id: string;
  current_academic_year: string;
  current_semester: number;
  institute_name: string;
  institute_address: string;
  institute_phone: string;
  institute_email: string;
  updated_at: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    classReminders: boolean;
    assignmentAlerts: boolean;
    examNotices: boolean;
    announcements: boolean;
    messages: boolean;
  };
  privacy: {
    showProfile: boolean;
    showAttendance: boolean;
    showMarks: boolean;
  };
  language: string;
  theme: 'light' | 'dark';
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon?: React.ElementType;
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
        sms: false,
        classReminders: true,
        assignmentAlerts: true,
        examNotices: true,
        announcements: true,
        messages: true,
      },
      privacy: {
        showProfile: true,
        showAttendance: false,
        showMarks: false,
      },
      language: 'en',
      theme: 'light',
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
   * Get social links
   */
  async getSocialLinks(): Promise<SocialLink[]> {
    // This would need a backend endpoint
    // For now, return from localStorage
    const stored = localStorage.getItem('socialLinks');
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }

  /**
   * Update social links
   */
  async updateSocialLinks(links: SocialLink[]): Promise<SocialLink[]> {
    // This would need a backend endpoint
    // For now, store in localStorage
    localStorage.setItem('socialLinks', JSON.stringify(links));
    return links;
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

  /**
   * Submit role switch request
   */
  async submitRoleRequest(data: { requested_role: string; reason: string }): Promise<any> {
    // This would need a backend endpoint
    // For now, simulate it
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: 'Role switch request submitted successfully' });
      }, 1000);
    });
  }
}

export const settingsService = new SettingsService();
