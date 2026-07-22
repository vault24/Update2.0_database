import { Link } from "react-router-dom";
import { Building2, GraduationCap, Users2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useDepartments } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function DepartmentsPage() {
  const { data, isLoading } = useDepartments();
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        title={t("section.departments")}
        subtitle={t("section.departmentsDesc")}
        crumbs={[{ label: t("nav.departments") }]}
      />
      <Container className="section">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<Building2 className="h-10 w-10 opacity-40" />} message="No departments found." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((d, i) => (
              <Reveal key={d.id} delay={i * 0.04}>
                <Link
                  to={`/departments/${d.code}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="relative h-36 bg-primary-soft">
                    {d.photo ? (
                      <img src={d.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-primary/40">
                        <Building2 className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-lg bg-primary/90 px-2.5 py-1 text-xs font-bold text-primary-foreground backdrop-blur">
                      {d.code}
                    </span>
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold capitalize text-foreground group-hover:text-primary">{d.name}</h2>
                    {d.head && <p className="mt-1 text-sm text-muted-foreground">Head: {d.head}</p>}
                    <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-primary" /> {d.student_count} {t("stats.students")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users2 className="h-4 w-4 text-primary" /> {d.teacher_count} {t("stats.teachers")}
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
