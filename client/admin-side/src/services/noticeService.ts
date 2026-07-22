import { apiClient as api } from '@/lib/api';

export interface NoticeAttachment {
  id: number;
  name: string;
  file_url: string | null;
  uploaded_at: string;
}

export type NoticeAudience =
  | 'everyone'
  | 'students_teachers'
  | 'students'
  | 'teachers'
  | 'alumni';

export interface TargetDepartment {
  id: string;
  name: string;
  code: string;
}

/** Audience + optional narrowing filters. Empty arrays = no restriction. */
export interface NoticeTargeting {
  audience: NoticeAudience;
  departments: string[];
  semesters: number[];
  shifts: string[];
  sessions: string[];
}

export interface TargetingMeta {
  audiences: Array<{ value: NoticeAudience; label: string }>;
  departments: TargetDepartment[];
  semesters: number[];
  shifts: string[];
  sessions: string[];
}

export interface RecipientPreview {
  students: number;
  teachers: number;
  alumni: number;
  total: number;
  total_users: number;
  audience: NoticeAudience;
}

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
  attachments?: NoticeAttachment[];
  audience: NoticeAudience;
  audience_display: string;
  target_departments: TargetDepartment[];
  target_semesters: number[];
  target_shifts: string[];
  target_sessions: string[];
  recipient_count: number | null;
}

export interface NoticeCreateUpdate {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  is_published: boolean;
  targeting?: NoticeTargeting;
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

  private buildFormData(notice: NoticeCreateUpdate, files?: File[], removeIds?: number[]): FormData {
    const fd = new FormData();
    fd.append('title', notice.title);
    fd.append('content', notice.content);
    fd.append('priority', notice.priority);
    fd.append('is_published', String(notice.is_published));
    // Audience targeting travels as a single JSON blob so multipart and JSON
    // requests share one server-side parsing path.
    if (notice.targeting) fd.append('targeting', JSON.stringify(notice.targeting));
    (files || []).forEach((f) => fd.append('attachments', f));
    (removeIds || []).forEach((id) => fd.append('remove_attachments', String(id)));
    return fd;
  }

  async createNotice(notice: NoticeCreateUpdate, files?: File[]): Promise<Notice> {
    if (files && files.length > 0) {
      return await api.post<Notice>(`${this.baseUrl}/`, this.buildFormData(notice, files));
    }
    return await api.post<Notice>(`${this.baseUrl}/`, notice);
  }

  async updateNotice(id: number, notice: NoticeCreateUpdate, files?: File[], removeIds?: number[]): Promise<Notice> {
    if ((files && files.length > 0) || (removeIds && removeIds.length > 0)) {
      return await api.put<Notice>(`${this.baseUrl}/${id}/`, this.buildFormData(notice, files, removeIds));
    }
    return await api.put<Notice>(`${this.baseUrl}/${id}/`, notice);
  }

  async deleteNotice(id: number): Promise<void> {
    await api.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /** Options for the targeting UI (departments, semesters, shifts, sessions). */
  async getTargetingMeta(): Promise<TargetingMeta> {
    return await api.get<TargetingMeta>(`${this.baseUrl}/targeting-meta/`);
  }

  /** Live "Estimated Recipients" preview for the current targeting selection. */
  async previewRecipients(targeting: NoticeTargeting): Promise<RecipientPreview> {
    return await api.post<RecipientPreview>(`${this.baseUrl}/recipient-preview/`, targeting);
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