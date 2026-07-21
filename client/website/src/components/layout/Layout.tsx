import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AnnouncementBar } from "./AnnouncementBar";
import { EmergencyBanner } from "./EmergencyBanner";
import { NoticeTicker } from "./NoticeTicker";
import { ScrollProgress } from "./ScrollProgress";
import { BackToTop } from "./BackToTop";
import { SearchDialog } from "@/components/SearchDialog";

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();

  // Scroll to top on route change.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ScrollProgress />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <EmergencyBanner />
      <AnnouncementBar />
      <Header onOpenSearch={() => setSearchOpen(true)} />
      <NoticeTicker />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
