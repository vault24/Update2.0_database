/**
 * Motivation Service - Updated to use real backend API
 * Handles API requests for motivational messages with multilingual support
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

// Service
export const motivationService = {
  /**
   * Get active motivational messages for students
   */
  getActiveMotivations: async (language: string = 'en'): Promise<MotivationResponse> => {
    try {
      return await apiClient.get<MotivationResponse>('motivations/messages/active/', {
        language,
        ordering: '-priority'
      });
    } catch (error) {
      console.error('Failed to fetch motivations:', error);
      // Return fallback data if API fails
      return {
        count: 3,
        results: [
          {
            id: 'fallback-1',
            title: 'Keep Going!',
            message: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
            author: 'Winston Churchill',
            category: 'encouragement',
            primary_language: 'en',
            display_duration: 86400,
            priority: 8,
            is_active: true,
            is_featured: true,
            view_count: 245,
            like_count: 32,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reference_source: 'Historical Quote'
          },
          {
            id: 'fallback-2',
            title: 'Education is Power',
            message: 'Education is the most powerful weapon which you can use to change the world.',
            author: 'Nelson Mandela',
            category: 'inspiration',
            primary_language: 'en',
            display_duration: 86400,
            priority: 9,
            is_active: true,
            is_featured: true,
            view_count: 189,
            like_count: 28,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reference_source: 'Historical Quote'
          },
          {
            id: 'fallback-3',
            title: 'Believe in Yourself',
            message: 'You are capable of amazing things. Every challenge is an opportunity to grow.',
            author: 'Academic Team',
            category: 'success',
            primary_language: 'en',
            display_duration: 86400,
            priority: 7,
            is_active: true,
            is_featured: false,
            view_count: 156,
            like_count: 21,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reference_source: 'Student Counseling'
          }
        ]
      };
    }
  },

  /**
   * Get random motivation message
   */
  getRandomMotivation: async (language: string = 'en'): Promise<MotivationMessage | null> => {
    try {
      return await apiClient.get<MotivationMessage>('motivations/messages/random/', {
        language
      });
    } catch (error) {
      console.error('Failed to get random motivation:', error);
      // Try to get from active motivations as fallback
      try {
        const response = await motivationService.getActiveMotivations(language);
        if (response.results.length > 0) {
          const randomIndex = Math.floor(Math.random() * response.results.length);
          return response.results[randomIndex];
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      return null;
    }
  },

  /**
   * Record motivation view (for analytics)
   */
  recordView: async (motivationId: string, language: string = 'en'): Promise<void> => {
    try {
      await apiClient.post(`motivations/messages/${motivationId}/view/`, {}, {
        language
      });
    } catch (error) {
      // Silently fail for view tracking
      console.debug('Failed to record motivation view:', error);
    }
  },

  /**
   * Like a motivation message
   */
  likeMotivation: async (motivationId: string): Promise<{ liked: boolean; message: string }> => {
    try {
      const response = await apiClient.post(`motivations/messages/${motivationId}/like/`);
      return response;
    } catch (error) {
      console.error('Failed to like motivation:', error);
      throw error;
    }
  },

  /**
   * Unlike a motivation message
   */
  unlikeMotivation: async (motivationId: string): Promise<{ liked: boolean; message: string }> => {
    try {
      const response = await apiClient.delete(`motivations/messages/${motivationId}/like/`);
      return response;
    } catch (error) {
      console.error('Failed to unlike motivation:', error);
      throw error;
    }
  }
};