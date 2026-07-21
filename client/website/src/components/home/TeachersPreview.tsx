import { Link } from "react-router-dom";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { useTeachers } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function TeachersPreview() {
  const { data, isLoading } = useTeachers();
  const { t, locale } = useI18n();
  const teachers = (data ?? []).slice(0, 4);

  return (
    <section className="section">
      <Container>
        <SectionHeading
          eyebrow={t("nav.teachers")}
          title={t("section.faculty")}
          description={t("section.facultyDesc")}
          align="left"
          action={
            <Link to="/teachers" className="hidden sm:block">
              <Button variant="outline" size="sm">{t("cta.viewAll")} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          }
        />
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map((tc, i) => (
              <Reveal key={tc.id} delay={i * 0.05}>
                <Link
                  to={`/teachers/${tc.id}`}
                  className="group flex h-full flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-full bg-primary opacity-0 blur transition-opacity group-hover:opacity-40" />
                    {tc.profilePhoto ? (
                      <img src={tc.profilePhoto} alt={tc.fullNameEnglish} className="relative h-24 w-24 rounded-full border-2 border-card object-cover" loading="lazy" />
                    ) : (
                      <div className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                        {initials(tc.fullNameEnglish)}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary">
                    {locale === "bn" && tc.fullNameBangla ? tc.fullNameBangla : tc.fullNameEnglish}
                  </h3>
                  <p className="text-sm text-primary">{tc.designation}</p>
                  {tc.department_name && <p className="mt-1 text-xs capitalize text-muted-foreground">{tc.department_name}</p>}
                  <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                    {tc.officeLocation && <span className="flex items-center justify-center gap-1"><MapPin className="h-3 w-3" /> {tc.officeLocation}</span>}
                    {tc.email && <span className="flex items-center justify-center gap-1 truncate"><Mail className="h-3 w-3" /> {tc.email}</span>}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
