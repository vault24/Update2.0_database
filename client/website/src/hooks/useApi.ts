import { useQuery } from "@tanstack/react-query";
import { apiGet, asList, type Paginated } from "@/lib/api";
import type {
  Achievement, Analytics, Club, Department, DownloadItem, EventItem, FAQItem,
  GalleryAlbum, GalleryAlbumDetail, HeroSlide, LibraryResource, NewsDetail,
  NewsItem, NoticeItem, PageContentData, ResearchProject, SiteSettings,
  SportsItem, Teacher, TeacherDetail, Testimonial,
} from "@/lib/types";

const FIVE_MIN = 5 * 60 * 1000;

export function useSiteSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<SiteSettings>("/settings/"),
    staleTime: FIVE_MIN,
  });
}

export function useHero() {
  return useQuery({
    queryKey: ["hero"],
    queryFn: () => apiGet<HeroSlide[]>("/hero/"),
    staleTime: FIVE_MIN,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiGet<Analytics>("/analytics/"),
    staleTime: FIVE_MIN,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => apiGet<Department[]>("/departments/"),
    staleTime: FIVE_MIN,
  });
}

export function useTeachers(params?: { department?: string }) {
  return useQuery({
    queryKey: ["teachers", params?.department ?? "all"],
    queryFn: async () => asList(await apiGet<Paginated<Teacher>>("/teachers/", params)),
    staleTime: FIVE_MIN,
  });
}

export function useNotices(params?: { priority?: string }) {
  return useQuery({
    queryKey: ["notices", params?.priority ?? "all"],
    queryFn: async () => asList(await apiGet<Paginated<NoticeItem>>("/notices/", params)),
    staleTime: FIVE_MIN,
  });
}

export function useEvents(params?: { when?: string; featured?: string }) {
  return useQuery({
    queryKey: ["events", params?.when ?? "all", params?.featured ?? "no"],
    queryFn: async () => asList(await apiGet<Paginated<EventItem>>("/events/", params)),
    staleTime: FIVE_MIN,
  });
}

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: async () => asList(await apiGet<Paginated<NewsItem>>("/news/")),
    staleTime: FIVE_MIN,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => asList(await apiGet<Paginated<Achievement>>("/achievements/")),
    staleTime: FIVE_MIN,
  });
}

export function useGallery() {
  return useQuery({
    queryKey: ["gallery"],
    queryFn: async () => asList(await apiGet<Paginated<GalleryAlbum>>("/gallery/")),
    staleTime: FIVE_MIN,
  });
}

export function useDownloads(params?: { category?: string }) {
  return useQuery({
    queryKey: ["downloads", params?.category ?? "all"],
    queryFn: async () => asList(await apiGet<Paginated<DownloadItem>>("/downloads/", params)),
    staleTime: FIVE_MIN,
  });
}

export function useTeacher(id: string | undefined) {
  return useQuery({
    queryKey: ["teacher", id],
    queryFn: () => apiGet<TeacherDetail>(`/teachers/${id}/`),
    enabled: !!id,
    staleTime: FIVE_MIN,
  });
}

export function useDepartment(code: string | undefined) {
  return useQuery({
    queryKey: ["department", code],
    queryFn: () => apiGet<Department>(`/departments/${code}/`),
    enabled: !!code,
    staleTime: FIVE_MIN,
  });
}

export function useNotice(id: string | undefined) {
  return useQuery({
    queryKey: ["notice", id],
    queryFn: () => apiGet<NoticeItem>(`/notices/${id}/`),
    enabled: !!id,
    staleTime: FIVE_MIN,
  });
}

export function useEvent(slug: string | undefined) {
  return useQuery({
    queryKey: ["event", slug],
    queryFn: () => apiGet<EventItem>(`/events/${slug}/`),
    enabled: !!slug,
    staleTime: FIVE_MIN,
  });
}

export function useNewsPost(slug: string | undefined) {
  return useQuery({
    queryKey: ["newsPost", slug],
    queryFn: () => apiGet<NewsDetail>(`/news/${slug}/`),
    enabled: !!slug,
    staleTime: FIVE_MIN,
  });
}

export function useAlbum(slug: string | undefined) {
  return useQuery({
    queryKey: ["album", slug],
    queryFn: () => apiGet<GalleryAlbumDetail>(`/gallery/${slug}/`),
    enabled: !!slug,
    staleTime: FIVE_MIN,
  });
}

export function useLibrary() {
  return useQuery({
    queryKey: ["library"],
    queryFn: async () => asList(await apiGet<Paginated<LibraryResource>>("/library/")),
    staleTime: FIVE_MIN,
  });
}

export function useClubs() {
  return useQuery({
    queryKey: ["clubs"],
    queryFn: async () => asList(await apiGet<Paginated<Club>>("/clubs/")),
    staleTime: FIVE_MIN,
  });
}

export function useSports() {
  return useQuery({
    queryKey: ["sports"],
    queryFn: async () => asList(await apiGet<Paginated<SportsItem>>("/sports/")),
    staleTime: FIVE_MIN,
  });
}

export function useResearch() {
  return useQuery({
    queryKey: ["research"],
    queryFn: async () => asList(await apiGet<Paginated<ResearchProject>>("/research/")),
    staleTime: FIVE_MIN,
  });
}

export function useTestimonials() {
  return useQuery({
    queryKey: ["testimonials"],
    queryFn: () => apiGet<Testimonial[]>("/testimonials/"),
    staleTime: FIVE_MIN,
  });
}

export function useFaq() {
  return useQuery({
    queryKey: ["faq"],
    queryFn: () => apiGet<FAQItem[]>("/faq/"),
    staleTime: FIVE_MIN,
  });
}

export function usePageContent(key: string) {
  return useQuery({
    queryKey: ["page", key],
    queryFn: () => apiGet<PageContentData>(`/pages/${key}/`),
    retry: false, // 404 simply means the page hasn't been authored yet
    staleTime: FIVE_MIN,
  });
}
