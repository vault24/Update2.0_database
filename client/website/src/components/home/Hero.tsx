import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, Award, Building2 } from "lucide-react";
import { useHero, useSiteSettings, useAnalytics } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Counter } from "@/components/ui/Counter";
import { SITE } from "@/config/site";

export function Hero() {
  const { data: slides } = useHero();
  const { data: settings } = useSiteSettings();
  const { data: analytics } = useAnalytics();
  const { t, pick, locale } = useI18n();
  const [idx, setIdx] = useState(0);

  const items = slides ?? [];
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [items.length]);

  const active = items[idx];
  const headline = active ? pick(active, "headline") : locale === "bn" ? SITE.nameBn : settings?.institute?.name || SITE.name;
  const subtitle = active
    ? pick(active, "subtitle")
    : pick(settings ?? null, "about_short") || t("hero.tagline");
  const bgImage = active?.image ?? null;
  const studentUrl = settings?.student_portal_url || SITE.studentPortal;

  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      {/* Background image crossfade */}
      <AnimatePresence mode="wait">
        {bgImage && (
          <motion.div
            key={bgImage}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      {/* Overlays */}
      <div className="absolute inset-0 bg-hero-radial" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/85 to-primary/40" />
      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <Container className="relative py-20 sm:py-24 lg:py-32">
        <div className="max-w-3xl">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium backdrop-blur"
          >
            <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-[#006a4e] to-[#f42a41]" />
            {t("hero.badge")}
          </motion.span>

          <AnimatePresence mode="wait">
            <motion.h1
              key={headline}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="heading-serif mt-6 text-4xl leading-[1.08] text-balance sm:text-5xl lg:text-6xl"
            >
              {headline}
            </motion.h1>
          </AnimatePresence>

          <p className="mt-5 max-w-2xl text-lg text-primary-foreground/80">{subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={studentUrl} target="_blank" rel="noreferrer">
              <Button variant="accent" size="lg">
                {t("cta.apply")} <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link to="/departments">
              <Button variant="glass" size="lg" className="text-primary-foreground">
                {t("cta.explore")}
              </Button>
            </Link>
          </div>

          {/* Inline quick stats */}
          {analytics && (
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-4">
              <HeroStat icon={GraduationCap} value={analytics.students.total} label={t("stats.students")} />
              <HeroStat icon={Building2} value={analytics.departments.total} label={t("stats.departments")} />
              <HeroStat icon={Award} value={analytics.teachers.total} label={t("stats.teachers")} />
            </div>
          )}
        </div>
      </Container>

      {/* Slide dots */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-accent" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HeroStat({ icon: Icon, value, label }: { icon: typeof GraduationCap; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
      <Icon className="h-5 w-5 text-accent" />
      <p className="mt-2 text-2xl font-bold">
        <Counter to={value} suffix="+" />
      </p>
      <p className="text-xs text-primary-foreground/70">{label}</p>
    </div>
  );
}
