/**
 * Notification Service
 * Handles API requests for notifications
 */

import { apiClient, PaginatedResponse } from '@/lib/api';

// Types
export interface Notification {
  id: string;
  recipient: string;
  notification_type: 'application_status' | 'document_approval' | 'student_admission' | 'system_announcement' | 'deadline_reminder' | 'account_activity' | 'attendance_update';
  title: string;
  message: string;
  data: {
    attendance_id?: string;
    subject_code?: string;
    subject_name?: string;
    date?: string;
    is_present?: boolean;
    status?: string;
    action?: string;
    [key: string]: any;
  };
  status: 'unread' | 'read' | 'archived' | 'deleted';
  created_at: string;
  read_at?: string;
  archived_at?: string;
  deleted_at?: string;
}

export interface NotificationFilters {
  page?: number;
  page_size?: number;
  notification_type?: string;
  status?: string;
  ordering?: string;
}

// Service
export const notificationService = {
  /**
   * Get my notifications
   */
  getMyNotifications: async (filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> => {
    return await apiClient.get<PaginatedResponse<Notification>>('notifications/', filters);
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    return await apiClient.post<Notification>(`notifications/${id}/mark_as_read/`, {});
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ message: string; updated: number }> => {
    return await apiClient.post<{ message: string; updated: number }>('notifications/mark_all_as_read/', {});
  },

  /**
   * Archive notification
   */
  archive: async (id: string): Promise<Notification> => {
    return await apiClient.post<Notification>(`notifications/${id}/archive/`, {});
  },

  /**
   * Delete notification
   */
  deleteNotification: async (id: string): Promise<void> => {
    return await apiClient.delete<void>(`notifications/${id}/`);
  },

  /**
   * Get unread count
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    return await apiClient.get<{ count: number }>('notifications/unread_count/');
  },
};
