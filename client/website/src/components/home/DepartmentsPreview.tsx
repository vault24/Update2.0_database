import { Link } from "react-router-dom";
import { ArrowRight, Users2, GraduationCap } from "lucide-react";
import { useDepartments } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";

const GRADIENTS = [
  "from-emerald-500/15 to-teal-500/10",
  "from-amber-500/15 to-orange-500/10",
  "from-sky-500/15 to-indigo-500/10",
  "from-rose-500/15 to-pink-500/10",
  "from-violet-500/15 to-purple-500/10",
  "from-cyan-500/15 to-blue-500/10",
];

export function DepartmentsPreview() {
  const { data, isLoading } = useDepartments();
  const { t } = useI18n();
  const departments = (data ?? []).slice(0, 6);

  return (
    <section className="section bg-surface">
      <Container>
        <SectionHeading
          eyebrow={t("nav.departments")}
          title={t("section.departments")}
          description={t("section.departmentsDesc")}
          align="left"
          action={
            <Link to="/departments" className="hidden sm:block">
              <Button variant="outline" size="sm">{t("cta.viewAll")} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          }
        />
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d, i) => (
              <Reveal key={d.id} delay={i * 0.05}>
                <Link
                  to={`/departments/${d.code}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className={`relative h-28 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                    {d.photo && (
                      <img src={d.photo} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" />
                    )}
                    <span className="absolute left-4 top-4 rounded-lg bg-primary/90 px-2.5 py-1 text-xs font-bold text-primary-foreground backdrop-blur">
                      {d.code}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold capitalize text-foreground group-hover:text-primary">{d.name}</h3>
                    <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-accent" /> {d.student_count} {t("stats.students")}</span>
                      <span className="flex items-center gap-1.5"><Users2 className="h-4 w-4 text-accent" /> {d.teacher_count}</span>
                    </div>
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
