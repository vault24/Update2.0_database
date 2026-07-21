import { useQuery } from "@tanstack/react-query";
import { apiGet, asList, type Paginated } from "@/lib/api";
import type {
  Achievement, Analytics, Department, DownloadItem, EventItem, GalleryAlbum,
  HeroSlide, NewsItem, NoticeItem, SiteSettings, Teacher,
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
