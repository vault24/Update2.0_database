import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, GraduationCap, Menu, Search, X } from "lucide-react";
import { NAV_GROUPS, SITE, type NavChild } from "@/config/site";
import { useI18n } from "@/i18n/LanguageProvider";
import { useSiteSettings } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Seal } from "@/components/brand/Seal";
import { EmergencyBanner } from "./EmergencyBanner";
import { AnnouncementBar } from "./AnnouncementBar";
import { cn } from "@/lib/utils";

/**
 * Single-row site header.
 *
 * `overlay` (home page): fixed and fully transparent over the full-screen hero
 * photo — the hero's centered logo carries the branding — then turns into a
 * frosted-glass bar once the page scrolls. Other pages: a sticky, always-solid
 * glass bar in normal flow (no layout padding tricks needed).
 */
export function Header({ overlay, onOpenSearch }: { overlay: boolean; onOpenSearch: () => void }) {
  const { t, locale, toggle: toggleLocale } = useI18n();
  const { data: settings } = useSiteSettings();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation; lock body scroll while the drawer is open.
  useEffect(() => {
    setDrawer(false);
    setOpenGroup(null);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const transparent = overlay && !scrolled;
  const nameLine = locale === "bn" ? SITE.nameBn : settings?.institute?.name || SITE.name;
  const studentUrl = settings?.student_portal_url || SITE.studentPortal;
  const adminUrl = settings?.admin_portal_url || SITE.adminPortal;
  const resultUrl = settings?.result_portal_url || SITE.resultPortal;

  const linkCls = cn(
    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
    transparent
      ? "text-white/90 hover:bg-white/10 hover:text-white"
      : "text-foreground/80 hover:bg-muted hover:text-primary",
  );
  const iconBtnCls = cn(
    "grid h-10 w-10 place-items-center rounded-full transition-colors",
    transparent
      ? "text-white/90 hover:bg-white/10 hover:text-white"
      : "border border-border text-muted-foreground hover:bg-muted",
  );

  return (
    <header className={cn("inset-x-0 top-0 z-50", overlay ? "fixed" : "sticky")}>
      <EmergencyBanner />
      <AnnouncementBar />

      <div
        className={cn(
          "transition-all duration-300",
          transparent ? "bg-transparent" : "glass border-b border-border/70 shadow-card",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-2 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
          {/* Brand — invisible (but space-preserving) while floating over the hero */}
          <Link
            to="/"
            className={cn("flex min-w-0 items-center gap-2.5", transparent && "invisible")}
            aria-hidden={transparent}
            tabIndex={transparent ? -1 : 0}
          >
            <div className="h-10 w-10 shrink-0 lg:h-11 lg:w-11">
              <Seal src={settings?.institute?.logo} />
            </div>
            <span className="heading-serif hidden max-w-[16rem] truncate text-[0.95rem] font-semibold leading-tight text-foreground min-[430px]:block lg:max-w-[19rem]">
              {nameLine}
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="mx-auto hidden items-center lg:flex" aria-label="Primary">
            {NAV_GROUPS.map((group) =>
              group.children ? (
                <div
                  key={group.key}
                  className="relative"
                  onMouseEnter={() => setOpenGroup(group.key)}
                  onMouseLeave={() => setOpenGroup(null)}
                >
                  <button
                    className={cn(linkCls, "flex items-center gap-1")}
                    aria-expanded={openGroup === group.key}
                    aria-haspopup="menu"
                    onClick={() => setOpenGroup(openGroup === group.key ? null : group.key)}
                  >
                    {t(group.key)}
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 opacity-70 transition-transform duration-200", openGroup === group.key && "rotate-180")}
                    />
                  </button>
                  <AnimatePresence>
                    {openGroup === group.key && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-1/2 top-full -translate-x-1/2 pt-3"
                      >
                        <div className="min-w-[230px] rounded-2xl border border-border bg-card p-2 shadow-lift">
                          {group.children.map((child) => (
                            <DropdownItem key={child.key} child={child} label={t(child.key)} onNavigate={() => setOpenGroup(null)} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <NavLink
                  key={group.key}
                  to={group.to!}
                  end={group.to === "/"}
                  className={({ isActive }) =>
                    cn(linkCls, isActive && (transparent ? "bg-white/15 text-white" : "bg-primary-soft text-primary"))
                  }
                >
                  {t(group.key)}
                </NavLink>
              ),
            )}
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <button onClick={onOpenSearch} className={iconBtnCls} aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={toggleLocale}
              className={cn(
                "h-10 rounded-full px-3 text-sm font-semibold transition-colors",
                transparent
                  ? "text-white/90 hover:bg-white/10 hover:text-white"
                  : "border border-border text-muted-foreground hover:bg-muted",
              )}
              aria-label="Switch language"
            >
              {locale === "en" ? "বাং" : "EN"}
            </button>
            <a href={studentUrl} target="_blank" rel="noreferrer" className="hidden md:block">
              <Button variant="primary" size="sm" className={cn(transparent && "shadow-none ring-1 ring-white/25")}>
                <GraduationCap className="h-4 w-4" /> {t("cta.studentLogin")}
              </Button>
            </a>
            <button onClick={() => setDrawer(true)} className={cn(iconBtnCls, "lg:hidden")} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Mobile drawer ---------------- */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 right-0 z-[70] flex w-[86vw] max-w-sm flex-col bg-card shadow-lift lg:hidden"
              role="dialog"
              aria-label="Menu"
            >
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="h-10 w-10 shrink-0">
                  <Seal src={settings?.institute?.logo} />
                </div>
                <p className="heading-serif min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{nameLine}</p>
                <button
                  onClick={() => setDrawer(false)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile">
                {NAV_GROUPS.map((group) =>
                  group.children ? (
                    <MobileGroup
                      key={group.key}
                      label={t(group.key)}
                      open={openGroup === group.key}
                      onToggle={() => setOpenGroup(openGroup === group.key ? null : group.key)}
                    >
                      {group.children.map((child) =>
                        child.external ? (
                          <a
                            key={child.key}
                            href={child.to}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] text-foreground/80 hover:bg-muted"
                          >
                            {t(child.key)} <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                          </a>
                        ) : (
                          <NavLink
                            key={child.key}
                            to={child.to}
                            className={({ isActive }) =>
                              cn(
                                "flex min-h-11 items-center rounded-xl px-4 py-2.5 text-[15px]",
                                isActive ? "bg-primary-soft font-medium text-primary" : "text-foreground/80 hover:bg-muted",
                              )
                            }
                          >
                            {t(child.key)}
                          </NavLink>
                        ),
                      )}
                    </MobileGroup>
                  ) : (
                    <NavLink
                      key={group.key}
                      to={group.to!}
                      end={group.to === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex min-h-12 items-center rounded-xl px-4 py-3 text-[15px] font-medium",
                          isActive ? "bg-primary-soft text-primary" : "text-foreground hover:bg-muted",
                        )
                      }
                    >
                      {t(group.key)}
                    </NavLink>
                  ),
                )}
              </nav>

              <div className="space-y-2.5 border-t border-border px-5 py-4">
                <a href={studentUrl} target="_blank" rel="noreferrer" className="block">
                  <Button variant="primary" className="w-full">
                    <GraduationCap className="h-4 w-4" /> {t("cta.studentLogin")}
                  </Button>
                </a>
                <a href={resultUrl} target="_blank" rel="noreferrer" className="block">
                  <Button variant="outline" className="w-full">
                    {t("cta.checkResult")}
                  </Button>
                </a>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <button onClick={toggleLocale} className="font-semibold text-primary">
                    {locale === "en" ? "বাংলা" : "English"}
                  </button>
                  {/* Admin — available, deliberately quiet */}
                  <a href={adminUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    {t("cta.adminLogin")} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function DropdownItem({ child, label, onNavigate }: { child: NavChild; label: string; onNavigate: () => void }) {
  const cls =
    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-primary-soft hover:text-primary";
  if (child.external) {
    return (
      <a href={child.to} target="_blank" rel="noreferrer" className={cls}>
        {label} <ExternalLink className="h-3.5 w-3.5 opacity-50" />
      </a>
    );
  }
  return (
    <NavLink to={child.to} className={cls} onClick={onNavigate}>
      {label}
    </NavLink>
  );
}

function MobileGroup({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-0.5">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium transition-colors",
          open ? "bg-muted text-primary" : "text-foreground hover:bg-muted",
        )}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 opacity-60 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden pl-2"
          >
            <div className="border-l border-border py-1 pl-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
