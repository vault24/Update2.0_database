import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useHero, useSiteSettings } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Seal } from "@/components/brand/Seal";
import { SITE } from "@/config/site";

const FALLBACK_IMAGE = "/cover-image1.jpg";

export function Hero() {
  const { data: slides } = useHero();
  const { data: settings } = useSiteSettings();
  const { t, pick } = useI18n();
  const [idx, setIdx] = useState(0);

  // Only slides that actually carry an image drive the background rotation;
  // otherwise the institute campus photo is the single, calm backdrop.
  const imageSlides = (slides ?? []).filter((s) => s.image);
  useEffect(() => {
    if (imageSlides.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % imageSlides.length), 7000);
    return () => clearInterval(id);
  }, [imageSlides.length]);

  const bgImage = imageSlides[idx]?.image ?? FALLBACK_IMAGE;
  const nameEn = settings?.institute?.name || SITE.name;
  const nameBn = SITE.nameBn;
  const activeSlide = imageSlides[idx];
  const tagline = (activeSlide && pick(activeSlide, "subtitle")) || t("hero.tagline");
  const studentUrl = settings?.student_portal_url || SITE.studentPortal;

  return (
    <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden text-center text-white">
      {/* Campus photo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={bgImage}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </AnimatePresence>
      {/* Single restrained overlay for legibility — photo-forward, not a colour wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-primary/70" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex max-w-3xl flex-col items-center py-20"
        >
          <div className="h-24 w-24 drop-shadow-lg sm:h-28 sm:w-28">
            <Seal src={settings?.institute?.logo} />
          </div>

          <h1 className="heading-serif mt-7 text-4xl leading-tight text-balance drop-shadow-md sm:text-5xl lg:text-6xl">
            {nameBn}
          </h1>
          <p className="mt-3 text-lg font-medium text-white/90 sm:text-2xl">{nameEn}</p>

          {/* Thin gold hairline — the single, restrained accent */}
          <span className="mt-6 h-px w-20 bg-accent/80" />

          <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">{tagline}</p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href={studentUrl} target="_blank" rel="noreferrer">
              <Button variant="primary" size="lg">
                {t("cta.apply")} <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link to="/departments">
              <Button
                variant="outline"
                size="lg"
                className="border-white/40 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15"
              >
                {t("cta.explore")}
              </Button>
            </Link>
          </div>
        </motion.div>
      </Container>

      {/* Slide dots (only when multiple photo slides exist) */}
      {imageSlides.length > 1 && (
        <div className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {imageSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-2 bg-white/50"}`}
            />
          ))}
        </div>
      )}

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/70"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <ChevronDown className="h-6 w-6" />
      </motion.div>
    </section>
  );
}
