import { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/Home";
import ComingSoon from "@/pages/ComingSoon";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

// Routes whose full pages ship in later phases render a themed placeholder now,
// so the navigation IA is complete and no link 404s.
const STUB_ROUTES: { path: string; title: string }[] = [
  { path: "/about", title: "About the Institute" },
  { path: "/departments", title: "Departments" },
  { path: "/departments/:code", title: "Department" },
  { path: "/teachers", title: "Faculty" },
  { path: "/teachers/:id", title: "Faculty Profile" },
  { path: "/academics", title: "Academic Information" },
  { path: "/notices", title: "Notice Board" },
  { path: "/notices/:id", title: "Notice" },
  { path: "/events", title: "Events" },
  { path: "/events/:slug", title: "Event" },
  { path: "/statistics", title: "Statistics & Analytics" },
  { path: "/gallery", title: "Gallery" },
  { path: "/gallery/:slug", title: "Album" },
  { path: "/downloads", title: "Downloads" },
  { path: "/contact", title: "Contact Us" },
  { path: "/privacy", title: "Privacy Policy" },
  { path: "/terms", title: "Terms of Use" },
  { path: "/faq", title: "Frequently Asked Questions" },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Suspense fallback={null}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  {STUB_ROUTES.map((r) => (
                    <Route key={r.path} path={r.path} element={<ComingSoon title={r.title} />} />
                  ))}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
