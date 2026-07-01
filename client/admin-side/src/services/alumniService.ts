/**
 * Alumni Service
 * Handles API requests for alumni management
 */

import { apiClient, PaginatedResponse } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

// Types
export interface CareerPosition {
  id?: string;
  positionType: string;
  organizationName: string;
  positionTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  location?: string;
  // Type-specific fields
  salary?: string;
  degree?: string;
  field?: string;
  institution?: string;
  businessName?: string;
  businessType?: string;
  otherType?: string;
  achievements?: string[];
}

export interface SupportHistoryEntry {
  date: string;
  previousCategory: string;
  newCategory: string;
  notes: string;
}

export interface Student {
  id: string;
  fullNameEnglish: string;
  fullNameBangla: string;
  currentRollNumber: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  semester: number;
  status: string;
  // Extended student fields (matching actual model)
  session?: string;
  shift?: string;
  email?: string;
  mobileStudent?: string;
  presentAddress?: {
    district?: string;
    upazila?: string;
    union?: string;
    village?: string;
  };
  gpa?: number;
  profilePhoto?: string;
}

export interface Alumni {
  student: Student;
  alumniType: 'recent' | 'established';
  transitionDate: string;
  graduationYear: number;
  currentSupportCategory: 'receiving_support' | 'needs_extra_support' | 'no_support_needed';
  currentPosition?: CareerPosition;
  careerHistory: CareerPosition[];
  supportHistory: SupportHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  // Extended alumni fields
  bio?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  coverImage?: string;
  skills?: SkillData[];
  highlights?: HighlightData[];
  courses?: CourseData[];
  // Verification fields
  isVerified?: boolean;
  lastEditedAt?: string;
  lastEditedBy?: string;
  verificationNotes?: string;
  // Registration workflow
  registrationSource?: 'pipeline' | 'admin_manual' | 'self_registration';
  reviewStatus?: 'pending' | 'approved' | 'rejected';
}

export interface AlumniDocumentCategory {
  key: string;
  display: string;
  isCustom: boolean;
}

export interface AlumniDocumentUpload {
  file: File;
  category: string;
  customName?: string;
}

export interface AlumniDocumentRecord {
  id: string;
  fileName: string;
  fileType: string;
  category: string;
  displayName: string;
  alumniCategory: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
}

export interface ManualCreateAlumniResult {
  alumni: Alumni;
  documents: { created: string[]; errors: string[] };
}

export interface PortalAccountResult {
  message: string;
  username: string;
  email: string;
  generatedPassword: string | null;
  hasAccount: boolean;
}

/**
 * Build the multipart FormData body shared by manual-create and document upload.
 */
function buildAlumniFormData(payload: Record<string, unknown> | null, documents: AlumniDocumentUpload[]): FormData {
  const fd = new FormData();
  if (payload) {
    fd.append('payload', JSON.stringify(payload));
  }
  const meta = documents.map((doc, index) => ({
    field: `doc_${index}`,
    category: doc.category,
    customName: doc.customName || '',
  }));
  fd.append('documentMeta', JSON.stringify(meta));
  documents.forEach((doc, index) => fd.append(`doc_${index}`, doc.file));
  return fd;
}

export interface AlumniFilters {
  page?: number;
  page_size?: number;
  alumniType?: string;
  currentSupportCategory?: string;
  graduationYear?: number;
  student__department?: string;
  ordering?: string;
}

export interface AlumniStats {
  total: number;
  recent: number;
  established: number;
  bySupport: Record<string, number>;
  byPosition: Record<string, number>;
  byYear: Record<string, number>;
  byDepartment: Record<string, number>;
}

export interface AlumniSearchParams {
  q?: string;
  department?: string;
  graduationYear?: number;
}

export interface AddCareerPositionData {
  positionType: string;
  organizationName: string;
  positionTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface UpdateSupportCategoryData {
  category: 'receiving_support' | 'needs_extra_support' | 'no_support_needed';
  notes?: string;
}

export interface SkillData {
  id?: string;
  name: string;
  category: 'technical' | 'soft' | 'language' | 'other';
  proficiency: number;
}

export interface HighlightData {
  id?: string;
  title: string;
  description: string;
  date: string;
  type: 'achievement' | 'milestone' | 'award' | 'project';
}

export interface CourseData {
  id?: string;
  name: string;
  provider: string;
  status: 'completed' | 'in_progress' | 'planned';
  completionDate?: string;
  certificateId?: string;
  certificateUrl?: string;
  description?: string;
}

export interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  linkedin?: string;
  portfolio?: string;
  coverImage?: string;
}

// Service
export const alumniService = {
  /**
   * Get paginated list of alumni
   */
  getAlumni: async (filters?: AlumniFilters): Promise<PaginatedResponse<Alumni>> => {
    return await apiClient.get<PaginatedResponse<Alumni>>(API_ENDPOINTS.alumni.list, filters);
  },

  /**
   * Get single alumni by student ID
   */
  getAlumniById: async (studentId: string): Promise<Alumni> => {
    return await apiClient.get<Alumni>(API_ENDPOINTS.alumni.detail(studentId));
  },

  /**
   * Create alumni record
   */
  createAlumni: async (data: Partial<Alumni>): Promise<Alumni> => {
    return await apiClient.post<Alumni>(API_ENDPOINTS.alumni.list, data);
  },

  /**
   * Update alumni record
   */
  updateAlumni: async (studentId: string, data: Partial<Alumni>): Promise<Alumni> => {
    return await apiClient.patch<Alumni>(API_ENDPOINTS.alumni.update(studentId), data);
  },

  /**
   * Delete alumni record
   */
  deleteAlumni: async (studentId: string): Promise<void> => {
    return await apiClient.delete<void>(API_ENDPOINTS.alumni.detail(studentId));
  },

  /**
   * Add career position to alumni
   */
  addCareerPosition: async (studentId: string, data: AddCareerPositionData): Promise<Alumni> => {
    return await apiClient.post<Alumni>(`/alumni/${studentId}/add_career_position/`, data);
  },

  /**
   * Update support category
   */
  updateSupportCategory: async (studentId: string, data: UpdateSupportCategoryData): Promise<Alumni> => {
    return await apiClient.put<Alumni>(`/alumni/${studentId}/update_support_category/`, data);
  },

  /**
   * Search alumni
   */
  searchAlumni: async (params: AlumniSearchParams): Promise<{ count: number; results: Alumni[] }> => {
    return await apiClient.get<{ count: number; results: Alumni[] }>(API_ENDPOINTS.alumni.search, params);
  },

  /**
   * Get alumni statistics
   */
  getAlumniStats: async (): Promise<AlumniStats> => {
    return await apiClient.get<AlumniStats>(`${API_ENDPOINTS.alumni.list}stats/`);
  },

  /**
   * Update career position
   */
  updateCareerPosition: async (studentId: string, careerId: string, data: AddCareerPositionData): Promise<Alumni> => {
    return await apiClient.put<Alumni>(`/alumni/${studentId}/career_positions/${careerId}/`, data);
  },

  /**
   * Delete career position
   */
  deleteCareerPosition: async (studentId: string, careerId: string): Promise<Alumni> => {
    return await apiClient.delete<Alumni>(`/alumni/${studentId}/career_positions/${careerId}/`);
  },

  /**
   * Add skill
   */
  addSkill: async (studentId: string, data: SkillData): Promise<Alumni> => {
    return await apiClient.post<Alumni>(`/alumni/${studentId}/skills/`, data);
  },

  /**
   * Update skill
   */
  updateSkill: async (studentId: string, skillId: string, data: SkillData): Promise<Alumni> => {
    return await apiClient.put<Alumni>(`/alumni/${studentId}/skills/${skillId}/`, data);
  },

  /**
   * Delete skill
   */
  deleteSkill: async (studentId: string, skillId: string): Promise<Alumni> => {
    return await apiClient.delete<Alumni>(`/alumni/${studentId}/skills/${skillId}/`);
  },

  /**
   * Add career highlight
   */
  addHighlight: async (studentId: string, data: HighlightData): Promise<Alumni> => {
    return await apiClient.post<Alumni>(`/alumni/${studentId}/highlights/`, data);
  },

  /**
   * Update career highlight
   */
  updateHighlight: async (studentId: string, highlightId: string, data: HighlightData): Promise<Alumni> => {
    return await apiClient.put<Alumni>(`/alumni/${studentId}/highlights/${highlightId}/`, data);
  },

  /**
   * Delete career highlight
   */
  deleteHighlight: async (studentId: string, highlightId: string): Promise<Alumni> => {
    return await apiClient.delete<Alumni>(`/alumni/${studentId}/highlights/${highlightId}/`);
  },

  /**
   * Update profile.
   *
   * The backend `profile` action reads `linkedinUrl`/`portfolioUrl` (not
   * `linkedin`/`portfolio`), so we map them here to ensure admin edits persist
   * and stay in sync with the alumni portal. `coverImage` passes through as-is.
   */
  updateProfile: async (studentId: string, data: ProfileData): Promise<Alumni> => {
    const payload: Record<string, unknown> = { ...data };
    if (data.linkedin !== undefined) payload.linkedinUrl = data.linkedin;
    if (data.portfolio !== undefined) payload.portfolioUrl = data.portfolio;
    return await apiClient.patch<Alumni>(`/alumni/${studentId}/profile/`, payload);
  },

  /**
   * Add course
   */
  addCourse: async (studentId: string, data: CourseData): Promise<Alumni> => {
    return await apiClient.post<Alumni>(`/alumni/${studentId}/courses/`, data);
  },

  /**
   * Update course
   */
  updateCourse: async (studentId: string, courseId: string, data: CourseData): Promise<Alumni> => {
    return await apiClient.put<Alumni>(`/alumni/${studentId}/courses/${courseId}/`, data);
  },

  /**
   * Delete course
   */
  deleteCourse: async (studentId: string, courseId: string): Promise<Alumni> => {
    return await apiClient.delete<Alumni>(`/alumni/${studentId}/courses/${courseId}/`);
  },

  /**
   * Verify alumni profile
   */
  verifyProfile: async (studentId: string, notes?: string): Promise<Alumni> => {
    return await apiClient.post<Alumni>(`/alumni/${studentId}/verify/`, { notes: notes || '' });
  },

  /**
   * Get the predefined document categories (plus 'custom') for the uploader.
   */
  getDocumentCategories: async (): Promise<{ categories: AlumniDocumentCategory[]; maxDocuments: number }> => {
    return await apiClient.get(API_ENDPOINTS.alumni.documentCategories);
  },

  /**
   * Manually create an alumni from essential info + documents (admin).
   * Creates the Student in the background and immediately moves them to Alumni.
   */
  manualCreateAlumni: async (
    payload: Record<string, unknown>,
    documents: AlumniDocumentUpload[] = [],
  ): Promise<ManualCreateAlumniResult> => {
    const fd = buildAlumniFormData(payload, documents);
    return await apiClient.post<ManualCreateAlumniResult>(API_ENDPOINTS.alumni.manualCreate, fd);
  },

  /**
   * List an alumni's documents.
   */
  getDocuments: async (studentId: string): Promise<{ documents: AlumniDocumentRecord[] }> => {
    return await apiClient.get(API_ENDPOINTS.alumni.documents(studentId));
  },

  /**
   * Upload more documents to an existing alumni (admin).
   */
  uploadDocuments: async (
    studentId: string,
    documents: AlumniDocumentUpload[],
  ): Promise<{ created: string[]; errors: string[] }> => {
    const fd = buildAlumniFormData(null, documents);
    return await apiClient.post(API_ENDPOINTS.alumni.documents(studentId), fd);
  },

  /**
   * Delete a single alumni document.
   */
  deleteDocument: async (studentId: string, documentId: string): Promise<void> => {
    return await apiClient.delete(API_ENDPOINTS.alumni.deleteDocument(studentId, documentId));
  },

  /**
   * Create a student-portal login for a manually-added alumnus (admin).
   */
  createPortalAccount: async (
    studentId: string,
    data?: { email?: string; password?: string },
  ): Promise<PortalAccountResult> => {
    return await apiClient.post(API_ENDPOINTS.alumni.createPortalAccount(studentId), data || {});
  },

  /**
   * Check whether a portal account is already linked to an alumni.
   */
  getPortalAccountStatus: async (
    studentId: string,
  ): Promise<{ hasAccount: boolean; username: string | null; email: string | null }> => {
    return await apiClient.get(API_ENDPOINTS.alumni.portalAccountStatus(studentId));
  },

  /**
   * List self-registered alumni awaiting verification (admin).
   */
  getPendingReview: async (): Promise<{ count: number; results: Alumni[] }> => {
    return await apiClient.get(API_ENDPOINTS.alumni.pendingReview);
  },

  /**
   * Approve or reject a self-registered alumni (admin).
   */
  reviewAlumni: async (
    studentId: string,
    action: 'approve' | 'reject',
    notes?: string,
  ): Promise<Alumni> => {
    return await apiClient.post(API_ENDPOINTS.alumni.review(studentId), { action, notes: notes || '' });
  },

  /**
   * Profile-completion report: each approved alumnus's completion % + missing
   * items, plus counts of who is below `threshold` and reachable by email.
   */
  getCompletionReport: async (params: CompletionReportParams): Promise<CompletionReport> => {
    const query: Record<string, string> = { threshold: String(params.threshold ?? 100) };
    if (params.department) query.department = params.department;
    if (params.registrationSource) query.registrationSource = params.registrationSource;
    const qs = new URLSearchParams(query).toString();
    return await apiClient.get(`${API_ENDPOINTS.alumni.completionReport}?${qs}`);
  },

  /**
   * Send (or preview, via dryRun) profile-completion reminder emails to alumni
   * below the given threshold, optionally filtered or to an explicit list.
   */
  sendCompletionReminders: async (body: SendRemindersBody): Promise<SendRemindersResult> => {
    return await apiClient.post(API_ENDPOINTS.alumni.sendCompletionReminders, body);
  },
};

export interface CompletionReportParams {
  threshold: number;
  department?: string;
  registrationSource?: string;
}

export interface CompletionReportRow {
  id: string;
  name: string;
  department: string;
  graduationYear: number | null;
  email: string;
  hasEmail: boolean;
  percentage: number;
  missing: string[];
  belowThreshold: boolean;
}

export interface CompletionReport {
  threshold: number;
  total: number;
  belowThreshold: number;
  eligibleForEmail: number;
  results: CompletionReportRow[];
}

export interface SendRemindersBody {
  threshold: number;
  department?: string;
  registrationSource?: string;
  studentIds?: string[];
  dryRun?: boolean;
}

export interface SendRemindersResult {
  dryRun: boolean;
  threshold: number;
  matched: number;
  sent: number;
  skippedNoEmail: number;
  failed: number;
  recipients: { id: string; name: string; email: string; percentage: number; status?: string }[];
}
