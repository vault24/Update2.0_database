import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Menu, X, Moon, Sun, Contrast, Phone, Mail, ExternalLink, GraduationCap } from "lucide-react";
import { PRIMARY_NAV, SITE } from "@/config/site";
import { useI18n } from "@/i18n/LanguageProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useSiteSettings } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Seal } from "@/components/brand/Seal";
import { cn } from "@/lib/utils";

export function Header({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { t, locale, toggle: toggleLocale } = useI18n();
  const { theme, toggleTheme, toggleContrast } = useTheme();
  const { data: settings } = useSiteSettings();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const instituteName = settings?.institute?.name || SITE.name;
  const nameLine = locale === "bn" ? SITE.nameBn : instituteName;
  const studentUrl = settings?.student_portal_url || SITE.studentPortal;
  const adminUrl = settings?.admin_portal_url || SITE.adminPortal;
  const resultUrl = settings?.result_portal_url || SITE.resultPortal;

  return (
    <header className="relative z-50">
      {/* Utility bar */}
      <div className="hidden bg-primary text-primary-foreground md:block">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-1.5 text-xs">
          <span className="flex items-center gap-2 opacity-90">
            <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-[#006a4e] to-[#f42a41]" />
            {t("hero.badge")}
          </span>
          <div className="flex items-center gap-4">
            {settings?.institute?.phone && (
              <a href={`tel:${settings.institute.phone}`} className="flex items-center gap-1.5 opacity-90 hover:opacity-100">
                <Phone className="h-3 w-3" /> {settings.institute.phone}
              </a>
            )}
            {settings?.institute?.email && (
              <a href={`mailto:${settings.institute.email}`} className="hidden items-center gap-1.5 opacity-90 hover:opacity-100 lg:flex">
                <Mail className="h-3 w-3" /> {settings.institute.email}
              </a>
            )}
            <button onClick={toggleLocale} className="rounded px-2 py-0.5 font-semibold hover:bg-white/10" aria-label="Switch language">
              {locale === "en" ? "বাংলা" : "English"}
            </button>
            {/* Admin login — intentionally low-key */}
            <a href={adminUrl} className="flex items-center gap-1 opacity-70 hover:opacity-100" target="_blank" rel="noreferrer">
              {t("cta.adminLogin")} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 sm:h-16 sm:w-16">
              <Seal src={settings?.institute?.logo} />
            </div>
            <div className="leading-tight">
              <p className="heading-serif text-base font-semibold text-foreground sm:text-xl">{nameLine}</p>
              <p className="text-[0.7rem] uppercase tracking-[0.15em] text-accent sm:text-xs">
                {t("hero.tagline")}
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onOpenSearch}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleContrast}
              className="hidden h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted sm:grid"
              aria-label="Toggle high contrast"
            >
              <Contrast className="h-4 w-4" />
            </button>
            <a href={resultUrl} target="_blank" rel="noreferrer" className="hidden sm:block">
              <Button variant="outline" size="sm">{t("cta.checkResult")}</Button>
            </a>
            {/* Student login — prominent */}
            <a href={studentUrl} target="_blank" rel="noreferrer" className="hidden sm:block">
              <Button variant="accent" size="sm">
                <GraduationCap className="h-4 w-4" /> {t("cta.studentLogin")}
              </Button>
            </a>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Primary nav (sticky) */}
      <nav
        className={cn(
          "sticky top-0 z-40 hidden border-b border-border transition-all lg:block",
          scrolled ? "glass shadow-card" : "bg-primary",
        )}
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-1 px-5">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative px-4 py-3.5 text-sm font-medium transition-colors",
                  scrolled ? "text-foreground hover:text-primary" : "text-primary-foreground/85 hover:text-primary-foreground",
                  isActive && (scrolled ? "text-primary" : "text-primary-foreground"),
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t(item.key)}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden border-b border-border bg-card lg:hidden"
        >
          <div className="mx-auto max-w-[1320px] px-5 py-3">
            <div className="grid grid-cols-2 gap-1">
              {PRIMARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive ? "bg-primary-soft text-primary" : "text-foreground hover:bg-muted",
                    )
                  }
                >
                  {t(item.key)}
                </NavLink>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <a href={studentUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="accent" size="sm" className="w-full">{t("cta.studentLogin")}</Button>
              </a>
              <a href={resultUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">{t("cta.checkResult")}</Button>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
}
