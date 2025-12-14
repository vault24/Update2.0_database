import api from '@/lib/api';

export interface Notice {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
  created_by_name: string;
  is_read: boolean;
}

export interface NoticeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notice[];
}

export interface UnreadCountResponse {
  unread_count: number;
  total_notices: number;
  read_count: number;
}

export interface MarkAsReadResponse {
  notice_id: number;
  is_read: boolean;
  read_at: string;
  already_read: boolean;
}

export const noticeService = {
  /**
   * Get list of published notices for authenticated users
   */
  async getNotices(params?: {
    page?: number;
    page_size?: number;
    priority?: 'low' | 'normal' | 'high';
    read_status?: 'read' | 'unread';
  }): Promise<NoticeListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.read_status) searchParams.append('read_status', params.read_status);

    const response = await api.get<NoticeListResponse>(`/notices/?${searchParams.toString()}`);
    return response;
  },

  /**
   * Get a specific notice by ID
   */
  async getNotice(id: number): Promise<Notice> {
    const response = await api.get<Notice>(`/notices/${id}/`);
    return response;
  },

  /**
   * Mark a notice as read
   */
  async markAsRead(noticeId: number): Promise<MarkAsReadResponse> {
    const response = await api.post<MarkAsReadResponse>(`/notices/${noticeId}/mark-read/`);
    return response;
  },

  /**
   * Get unread notices count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await api.get<UnreadCountResponse>('/notices/unread-count/');
    return response;
  },

  /**
   * Get recent notices for dashboard (limited to 5)
   */
  async getRecentNotices(): Promise<Notice[]> {
    const response = await this.getNotices({ page_size: 5 });
    return response.results;
  },

  /**
   * Get unread notices for dashboard
   */
  async getUnreadNotices(limit: number = 3): Promise<Notice[]> {
    const response = await this.getNotices({ 
      read_status: 'unread', 
      page_size: limit 
    });
    return response.results;
  },

  /**
   * Mark multiple notices as read in bulk
   */
  async bulkMarkAsRead(noticeIds: number[]): Promise<{
    marked_as_read: number;
    already_read: number;
    not_found: number;
    total_requested: number;
  }> {
    const response = await api.post<{
      marked_as_read: number;
      already_read: number;
      not_found: number;
      total_requested: number;
    }>('/notices/bulk-mark-read/', {
      notice_ids: noticeIds
    });
    return response;
  }
};