/**
 * Notification Service
 * Handles API requests for notifications
 */

import { apiClient } from '@/lib/api';

// Types
export interface Notification {
  id: string;
  recipient: string;
  notification_type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  status: 'unread' | 'read' | 'archived' | 'deleted';
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

// Service
export const notificationService = {
  /**
   * Get notifications for the current user
   */
  getNotifications: async (params?: {
    status?: string;
    notification_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<NotificationListResponse> => {
    return await apiClient.get<NotificationListResponse>('notifications/', params);
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCountResponse>('notifications/unread_count/');
    return response.count;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    return await apiClient.post<Notification>(`notifications/${id}/mark_as_read/`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ message: string; updated: number }> => {
    return await apiClient.post<{ message: string; updated: number }>('notifications/mark_all_as_read/');
  },

  /**
   * Archive a notification
   */
  archiveNotification: async (id: string): Promise<Notification> => {
    return await apiClient.post<Notification>(`notifications/${id}/archive/`);
  },

  /**
   * Delete a notification (soft delete)
   */
  deleteNotification: async (id: string): Promise<void> => {
    return await apiClient.delete(`notifications/${id}/soft_delete/`);
  },
};
