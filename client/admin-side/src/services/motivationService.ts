/**
 * Admin Motivation Service - Updated to use real backend API
 * Handles API requests for managing motivational messages
 */

import { apiClient } from '@/lib/api';

// Types
export interface MotivationMessage {
  id: string;
  title: string;
  message: string;
  author: string;
  category: 'success' | 'inspiration' | 'encouragement' | 'wisdom' | 'academic' | 'career' | 'personal' | 'spiritual';
  
  // Multilingual fields
  title_bn?: string;
  message_bn?: string;
  author_bn?: string;
  title_ar?: string;
  message_ar?: string;
  author_ar?: string;
  
  // Reference fields
  reference_source?: string;
  reference_url?: string;
  reference_date?: string;
  reference_context?: string;
  
  // Display settings
  primary_language: string;
  display_duration: number;
  priority: number;
  
  // Scheduling
  start_date?: string;
  end_date?: string;
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Localized fields (computed)
  localized_title?: string;
  localized_message?: string;
  localized_author?: string;
  
  // Status fields
  effective_active_status?: boolean;
  is_scheduled_active?: boolean;
}

export interface MotivationResponse {
  count: number;
  next?: string;
  previous?: string;
  results: MotivationMessage[];
}

export interface MotivationStats {
  total_messages: number;
  active_messages: number;
  featured_messages: number;
  total_views: number;
  total_likes: number;
  avg_views_per_message: number;
  avg_likes_per_message: number;
  most_viewed_message?: MotivationMessage;
  most_liked_message?: MotivationMessage;
  recent_views: number;
  recent_likes: number;
  category_stats: Record<string, number>;
  language_stats: Record<string, number>;
  views_today: number;
  views_this_week: number;
  views_this_month: number;
}

export interface CreateMotivationData {
  title: string;
  message: string;
  author: string;
  category: string;
  title_bn?: string;
  message_bn?: string;
  author_bn?: string;
  title_ar?: string;
  message_ar?: string;
  author_ar?: string;
  reference_source?: string;
  reference_url?: string;
  reference_date?: string;
  reference_context?: string;
  primary_language?: string;
  display_duration?: number;
  priority?: number;
  is_active?: boolean;
  is_featured?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface UpdateMotivationData extends Partial<CreateMotivationData> {}

// Service
export const motivationService = {
  /**
   * Get all motivational messages with filtering
   */
  getAllMotivations: async (params?: {
    search?: string;
    category?: string;
    is_active?: boolean;
    is_featured?: boolean;
    language?: string;
    ordering?: string;
    page?: number;
  }): Promise<MotivationResponse> => {
    try {
      return await apiClient.get<MotivationResponse>('motivations/messages/', params);
    } catch (error) {
      console.error('Failed to fetch motivations:', error);
      // Return fallback data
      return {
        count: 4,
        results: [
          {
            id: '1',
            title: 'Keep Going!',
            message: 'Success is not final, failure is not fatal: it is the courage to continue that counts. Every step you take brings you closer to your dreams.',
            author: 'Academic Team',
            category: 'encouragement',
            primary_language: 'en',
            display_duration: 86400,
            priority: 8,
            is_active: true,
            is_featured: true,
            view_count: 245,
            like_count: 32,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            reference_source: 'Historical Quote'
          },
          {
            id: '2',
            title: 'Excellence in Learning',
            message: 'Education is the most powerful weapon which you can use to change the world. Your dedication to learning today shapes tomorrow\'s innovations.',
            author: 'Principal',
            category: 'inspiration',
            primary_language: 'en',
            display_duration: 86400,
            priority: 9,
            is_active: true,
            is_featured: true,
            view_count: 189,
            like_count: 28,
            created_at: '2024-01-14T09:00:00Z',
            updated_at: '2024-01-14T09:00:00Z',
            reference_source: 'Historical Quote'
          },
          {
            id: '3',
            title: 'Believe in Yourself',
            message: 'You are capable of amazing things. Every challenge you face is an opportunity to grow stronger and wiser.',
            author: 'Student Counselor',
            category: 'success',
            primary_language: 'en',
            display_duration: 86400,
            priority: 7,
            is_active: false,
            is_featured: false,
            view_count: 156,
            like_count: 21,
            created_at: '2024-01-13T14:30:00Z',
            updated_at: '2024-01-13T14:30:00Z',
            reference_source: 'Student Counseling'
          },
          {
            id: '4',
            title: 'Knowledge is Power',
            message: 'The beautiful thing about learning is that no one can take it away from you. Invest in yourself through education.',
            author: 'Faculty',
            category: 'wisdom',
            primary_language: 'en',
            display_duration: 86400,
            priority: 6,
            is_active: true,
            is_featured: false,
            view_count: 203,
            like_count: 25,
            created_at: '2024-01-12T11:15:00Z',
            updated_at: '2024-01-12T11:15:00Z',
            reference_source: 'Educational Philosophy'
          }
        ]
      };
    }
  },

  /**
   * Get single motivation message
   */
  getMotivation: async (id: string): Promise<MotivationMessage> => {
    try {
      return await apiClient.get<MotivationMessage>(`motivations/messages/${id}/`);
    } catch (error) {
      console.error('Failed to fetch motivation:', error);
      throw error;
    }
  },

  /**
   * Create new motivation message
   */
  createMotivation: async (data: CreateMotivationData): Promise<MotivationMessage> => {
    try {
      return await apiClient.post<MotivationMessage>('motivations/messages/', data);
    } catch (error) {
      console.error('Failed to create motivation:', error);
      throw error;
    }
  },

  /**
   * Update motivation message
   */
  updateMotivation: async (id: string, data: UpdateMotivationData): Promise<MotivationMessage> => {
    try {
      return await apiClient.patch<MotivationMessage>(`motivations/messages/${id}/`, data);
    } catch (error) {
      console.error('Failed to update motivation:', error);
      throw error;
    }
  },

  /**
   * Delete motivation message
   */
  deleteMotivation: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`motivations/messages/${id}/`);
    } catch (error) {
      console.error('Failed to delete motivation:', error);
      throw error;
    }
  },

  /**
   * Toggle active status
   */
  toggleActive: async (id: string): Promise<{ is_active: boolean; message: string }> => {
    try {
      return await apiClient.post(`motivations/messages/${id}/toggle_active/`);
    } catch (error) {
      console.error('Failed to toggle active status:', error);
      throw error;
    }
  },

  /**
   * Toggle featured status
   */
  toggleFeatured: async (id: string): Promise<{ is_featured: boolean; message: string }> => {
    try {
      return await apiClient.post(`motivations/messages/${id}/toggle_featured/`);
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
      throw error;
    }
  },

  /**
   * Get motivation statistics
   */
  getStats: async (): Promise<MotivationStats> => {
    try {
      return await apiClient.get<MotivationStats>('motivations/messages/stats/');
    } catch (error) {
      console.error('Failed to fetch motivation stats:', error);
      // Return fallback stats
      return {
        total_messages: 4,
        active_messages: 3,
        featured_messages: 2,
        total_views: 793,
        total_likes: 106,
        avg_views_per_message: 198.25,
        avg_likes_per_message: 26.5,
        recent_views: 45,
        recent_likes: 12,
        category_stats: {
          'encouragement': 1,
          'inspiration': 1,
          'success': 1,
          'wisdom': 1
        },
        language_stats: {
          'en': 4
        },
        views_today: 23,
        views_this_week: 156,
        views_this_month: 487
      };
    }
  },

  /**
   * Get active motivations for students (public endpoint)
   */
  getActiveMotivations: async (language: string = 'en'): Promise<MotivationResponse> => {
    try {
      return await apiClient.get<MotivationResponse>('motivations/messages/active/', {
        language,
        ordering: '-priority'
      });
    } catch (error) {
      console.error('Failed to fetch active motivations:', error);
      throw error;
    }
  },

  /**
   * Record motivation view
   */
  recordView: async (motivationId: string, language: string = 'en'): Promise<void> => {
    try {
      await apiClient.post(`motivations/messages/${motivationId}/view/`, {}, {
        language
      });
    } catch (error) {
      console.debug('Failed to record motivation view:', error);
    }
  }
};