/* Shapes returned by /api/website/* — mirror the DRF serializers. */

export interface Bilingual {
  en: string;
  bn?: string;
}

export interface SiteSettings {
  id: string;
  about_short_en: string;
  about_short_bn: string;
  about_full_en: string;
  history_en: string;
  mission_en: string;
  vision_en: string;
  established_year: string;
  principal_name_en: string;
  principal_designation_en: string;
  principal_message_en: string;
  principal_photo: string | null;
  contact_address_en: string;
  contact_phone: string;
  contact_email: string;
  map_embed_url: string;
  facebook_url: string;
  youtube_url: string;
  linkedin_url: string;
  emergency_notice_enabled: boolean;
  emergency_notice_en: string;
  emergency_notice_bn: string;
  announcement_enabled: boolean;
  announcement_en: string;
  announcement_bn: string;
  announcement_link: string;
  student_portal_url: string;
  admin_portal_url: string;
  result_portal_url: string;
  institute: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo: string | null;
    current_academic_year: string;
  } | null;
}

export interface HeroSlide {
  id: string;
  image: string | null;
  headline_en: string;
  headline_bn: string;
  subtitle_en: string;
  subtitle_bn: string;
  cta_label_en: string;
  cta_label_bn: string;
  cta_url: string;
}

export interface EventItem {
  id: string;
  title_en: string;
  title_bn: string;
  slug: string;
  description_en: string;
  category: string;
  cover_image: string | null;
  venue: string;
  start_at: string;
  end_at: string | null;
  is_featured: boolean;
}

export interface NewsItem {
  id: string;
  title_en: string;
  title_bn: string;
  slug: string;
  excerpt_en: string;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  head: string | null;
  established_year: string | null;
  photo: string | null;
  student_count: number;
  teacher_count: number;
}

export interface Teacher {
  id: string;
  fullNameEnglish: string;
  fullNameBangla: string;
  designation: string;
  department_name: string | null;
  department_code: string | null;
  qualifications: unknown[];
  specializations: string[];
  subjects: string[];
  headline: string;
  profilePhoto: string;
  email: string;
  officeLocation: string;
  employmentStatus: string;
}

export interface NoticeItem {
  id: number;
  title: string;
  content: string;
  priority: "low" | "normal" | "high";
  created_at: string;
  attachments: { id: number; file: string | null; original_name: string }[];
}

export interface Achievement {
  id: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  category: string;
  image: string | null;
  achieved_on: string | null;
  department_name: string | null;
}

export interface TeacherDetail extends Teacher {
  about: string;
  coverPhoto: string;
  skills: string[];
  education: { degree: string; institution: string; year: string; field: string; order: number }[];
  experiences: {
    title: string; institution: string; location: string; startDate: string;
    endDate: string; current: boolean; description: string; order: number;
  }[];
}

export interface GalleryImage {
  id: string;
  image: string | null;
  caption_en: string;
  caption_bn: string;
  video_url: string;
  order: number;
}

export interface GalleryAlbumDetail extends GalleryAlbum {
  images: GalleryImage[];
}

export interface LibraryResource {
  id: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  resource_url: string;
  file: string | null;
  cover_image: string | null;
}

export interface Club {
  id: string;
  name_en: string;
  name_bn: string;
  description_en: string;
  description_bn: string;
  logo: string | null;
  moderator: string;
  contact_email: string;
}

export interface SportsItem {
  id: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  image: string | null;
}

export interface ResearchProject {
  id: string;
  title_en: string;
  title_bn: string;
  abstract_en: string;
  abstract_bn: string;
  authors: string;
  status: string;
  year: string;
  link: string;
  file: string | null;
  department_name: string | null;
  created_at: string;
}

export interface FAQItem {
  id: string;
  question_en: string;
  question_bn: string;
  answer_en: string;
  answer_bn: string;
  category: string;
}

export interface PageContentData {
  key: string;
  title_en: string;
  title_bn: string;
  body_en: string;
  body_bn: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name_en: string;
  name_bn: string;
  role_en: string;
  role_bn: string;
  quote_en: string;
  quote_bn: string;
  photo: string | null;
}

export interface NewsDetail extends NewsItem {
  body_en: string;
  body_bn: string;
}

export interface GalleryAlbum {
  id: string;
  title_en: string;
  title_bn: string;
  slug: string;
  description_en: string;
  cover_image: string | null;
  image_count: number;
}

export interface DownloadItem {
  id: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  category: string;
  file: string | null;
  file_size: number | null;
  download_count: number;
}

export interface Analytics {
  students: {
    total: number;
    current: number;
    graduated: number;
    male: number;
    female: number;
    other: number;
    by_semester: Record<string, number>;
  };
  teachers: { total: number };
  departments: {
    total: number;
    breakdown: { name: string; code: string; students: number; teachers: number }[];
  };
}
