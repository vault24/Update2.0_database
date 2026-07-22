import { useParams, Link } from "react-router-dom";
import { Building2, CalendarDays, GraduationCap, Users2, UserRound } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDepartment, useTeachers } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function DepartmentDetailPage() {
  const { code } = useParams();
  const { data: dept, isLoading } = useDepartment(code);
  const { data: teachers, isLoading: tLoading } = useTeachers({ department: code });
  const { t } = useI18n();

  if (isLoading) {
    return (
      <Container className="section">
        <Skeleton className="h-64" />
      </Container>
    );
  }
  if (!dept) {
    return (
      <Container className="section">
        <EmptyState message="Department not found." />
      </Container>
    );
  }

  return (
    <>
      <PageHeader
        title={dept.name}
        subtitle={dept.head ? `Head of Department: ${dept.head}` : undefined}
        crumbs={[{ label: t("nav.departments"), to: "/departments" }, { label: dept.code }]}
      />
      <Container className="section space-y-12">
        {/* Overview */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {dept.photo ? (
              <img src={dept.photo} alt={dept.name} className="h-72 w-full object-cover" />
            ) : (
              <div className="grid h-72 w-full place-items-center bg-primary-soft text-primary/40">
                <Building2 className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="grid content-start gap-4">
            <StatRow icon={GraduationCap} label={t("stats.students")} value={dept.student_count} />
            <StatRow icon={Users2} label={t("stats.teachers")} value={dept.teacher_count} />
            {dept.established_year && <StatRow icon={CalendarDays} label="Established" value={dept.established_year} />}
          </div>
        </div>

        {/* Faculty of this department */}
        <section>
          <h2 className="heading-serif mb-6 text-2xl text-foreground sm:text-3xl">{t("section.faculty")}</h2>
          {tLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
            </div>
          ) : (teachers ?? []).length === 0 ? (
            <EmptyState icon={<UserRound className="h-10 w-10 opacity-40" />} message="No faculty members listed yet." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {(teachers ?? []).map((tc) => (
                <Link
                  key={tc.id}
                  to={`/teachers/${tc.id}`}
                  className="group flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  {tc.profilePhoto ? (
                    <img src={tc.profilePhoto} alt={tc.fullNameEnglish} className="h-20 w-20 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                      {initials(tc.fullNameEnglish)}
                    </div>
                  )}
                  <p className="mt-3 font-semibold text-foreground group-hover:text-primary">{tc.fullNameEnglish}</p>
                  <p className="text-sm text-primary">{tc.designation}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </Container>
    </>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
