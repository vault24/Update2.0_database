import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { Skeleton } from "@/components/ui/Skeleton";
import { Container } from "@/components/ui/Container";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

/* Route-level code splitting: each page loads on demand (the Statistics page's
   chart library, for example, never touches the home bundle). */
const DepartmentsPage = lazy(() => import("@/pages/DepartmentsPage"));
const DepartmentDetailPage = lazy(() => import("@/pages/DepartmentDetailPage"));
const TeachersPage = lazy(() => import("@/pages/TeachersPage"));
const TeacherProfilePage = lazy(() => import("@/pages/TeacherProfilePage"));
const NoticesPage = lazy(() => import("@/pages/NoticesPage"));
const NoticeDetailPage = lazy(() => import("@/pages/NoticeDetailPage"));
const StatisticsPage = lazy(() => import("@/pages/StatisticsPage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
const NewsPage = lazy(() => import("@/pages/NewsPage"));
const NewsDetailPage = lazy(() => import("@/pages/NewsDetailPage"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const AlbumPage = lazy(() => import("@/pages/AlbumPage"));
const DownloadsPage = lazy(() => import("@/pages/DownloadsPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const PrincipalPage = lazy(() => import("@/pages/PrincipalPage"));
const CampusPage = lazy(() => import("@/pages/CampusPage"));
const AcademicsPage = lazy(() => import("@/pages/AcademicsPage"));
const ClubsPage = lazy(() => import("@/pages/ClubsPage"));
const SportsPage = lazy(() => import("@/pages/SportsPage"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const ResearchPage = lazy(() => import("@/pages/ResearchPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const FaqPage = lazy(() => import("@/pages/FaqPage"));
const ContentPage = lazy(() => import("@/pages/ContentPage"));

function PageFallback() {
  return (
    <Container className="section">
      <Skeleton className="h-72" />
    </Container>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Routes>
                      <Route path="/departments" element={<DepartmentsPage />} />
                      <Route path="/departments/:code" element={<DepartmentDetailPage />} />
                      <Route path="/teachers" element={<TeachersPage />} />
                      <Route path="/teachers/:id" element={<TeacherProfilePage />} />
                      <Route path="/notices" element={<NoticesPage />} />
                      <Route path="/notices/:id" element={<NoticeDetailPage />} />
                      <Route path="/statistics" element={<StatisticsPage />} />
                      <Route path="/events" element={<EventsPage />} />
                      <Route path="/events/:slug" element={<EventDetailPage />} />
                      <Route path="/news" element={<NewsPage />} />
                      <Route path="/news/:slug" element={<NewsDetailPage />} />
                      <Route path="/gallery" element={<GalleryPage />} />
                      <Route path="/gallery/:slug" element={<AlbumPage />} />
                      <Route path="/downloads" element={<DownloadsPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/principal" element={<PrincipalPage />} />
                      <Route path="/campus" element={<CampusPage />} />
                      <Route path="/academics" element={<AcademicsPage />} />
                      <Route path="/clubs" element={<ClubsPage />} />
                      <Route path="/sports" element={<SportsPage />} />
                      <Route path="/library" element={<LibraryPage />} />
                      <Route path="/research" element={<ResearchPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/faq" element={<FaqPage />} />
                      <Route path="/privacy" element={<ContentPage pageKey="privacy" fallbackTitle="Privacy Policy" />} />
                      <Route path="/terms" element={<ContentPage pageKey="terms" fallbackTitle="Terms of Use" />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
