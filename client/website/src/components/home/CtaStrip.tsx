import { ArrowRight, FileDown, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/config/site";

export function CtaStrip() {
  const { data } = useSiteSettings();
  const { t } = useI18n();
  const studentUrl = data?.student_portal_url || SITE.studentPortal;

  return (
    <section className="section">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground shadow-glass sm:px-12">
          <div className="absolute inset-0 bg-hero-radial opacity-70" />
          <div className="relative mx-auto max-w-2xl">
            <span className="eyebrow justify-center text-accent"><span className="h-px w-6 bg-accent" /> {t("cta.apply")}</span>
            <h2 className="heading-serif mt-4 text-3xl sm:text-4xl">Begin your diploma engineering journey at {SITE.shortName}</h2>
            <p className="mt-4 text-primary-foreground/75">
              Admissions, forms and important documents — everything you need to join a leading government polytechnic.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={studentUrl} target="_blank" rel="noreferrer">
                <Button variant="accent" size="lg"><GraduationCap className="h-4 w-4" /> {t("cta.apply")} <ArrowRight className="h-4 w-4" /></Button>
              </a>
              <Link to="/downloads">
                <Button variant="glass" size="lg" className="text-primary-foreground"><FileDown className="h-4 w-4" /> {t("section.downloads")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
