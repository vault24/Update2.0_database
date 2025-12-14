import { apiClient as api } from '@/lib/api';

export interface Notice {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_name: string;
  read_count: number;
  total_students: number;
  read_percentage: number;
  is_low_engagement: boolean;
}

export interface NoticeCreateUpdate {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  is_published: boolean;
}

export interface NoticeStats {
  notice_id: number;
  title: string;
  priority: string;
  created_at: string;
  is_published: boolean;
  read_count: number;
  total_students: number;
  read_percentage: number;
  is_low_engagement: boolean;
  unread_count: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class NoticeService {
  private baseUrl = '/admin/notices';

  async getNotices(params?: {
    page?: number;
    page_size?: number;
    is_published?: boolean;
    priority?: string;
  }): Promise<PaginatedResponse<Notice>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.is_published !== undefined) searchParams.append('is_published', params.is_published.toString());
    if (params?.priority) searchParams.append('priority', params.priority);

    const response = await api.get<PaginatedResponse<Notice>>(`${this.baseUrl}/?${searchParams.toString()}`);
    return response;
  }

  async getNotice(id: number): Promise<Notice> {
    const response = await api.get<Notice>(`${this.baseUrl}/${id}/`);
    return response;
  }

  async createNotice(notice: NoticeCreateUpdate): Promise<Notice> {
    const response = await api.post<Notice>(`${this.baseUrl}/`, notice);
    return response;
  }

  async updateNotice(id: number, notice: NoticeCreateUpdate): Promise<Notice> {
    const response = await api.put<Notice>(`${this.baseUrl}/${id}/`, notice);
    return response;
  }

  async deleteNotice(id: number): Promise<void> {
    await api.delete<void>(`${this.baseUrl}/${id}/`);
  }

  async getNoticeStats(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<NoticeStats>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());

    const response = await api.get<PaginatedResponse<NoticeStats>>(`${this.baseUrl}/stats/?${searchParams.toString()}`);
    return response;
  }

  async getNoticeDetailStats(id: number): Promise<{
    notice: Notice;
    total_students: number;
    read_count: number;
    unread_count: number;
    read_percentage: number;
    is_low_engagement: boolean;
    read_students: Array<{
      id: number;
      name: string;
      username: string;
      read_at: string;
    }>;
  }> {
    const response = await api.get<{
      notice: Notice;
      total_students: number;
      read_count: number;
      unread_count: number;
      read_percentage: number;
      is_low_engagement: boolean;
      read_students: Array<{
        id: number;
        name: string;
        username: string;
        read_at: string;
      }>;
    }>(`${this.baseUrl}/${id}/stats/`);
    return response;
  }

  async getEngagementSummary(): Promise<{
    total_notices: number;
    total_students: number;
    average_engagement: number;
    high_engagement_notices: number;
    low_engagement_notices: number;
    total_possible_reads: number;
    total_actual_reads: number;
  }> {
    const response = await api.get<{
      total_notices: number;
      total_students: number;
      average_engagement: number;
      high_engagement_notices: number;
      low_engagement_notices: number;
      total_possible_reads: number;
      total_actual_reads: number;
    }>(`${this.baseUrl}/engagement-summary/`);
    return response;
  }
}

export const noticeService = new NoticeService();