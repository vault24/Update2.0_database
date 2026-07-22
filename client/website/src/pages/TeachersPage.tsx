import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, UserRound } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useDepartments, useTeachers } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function TeachersPage() {
  const [dept, setDept] = useState<string>("");
  const { data: departments } = useDepartments();
  const { data: teachers, isLoading } = useTeachers(dept ? { department: dept } : undefined);
  const { t, locale } = useI18n();

  return (
    <>
      <PageHeader
        title={t("section.faculty")}
        subtitle={t("section.facultyDesc")}
        crumbs={[{ label: t("nav.teachers") }]}
      />
      <Container className="section">
        {/* Department filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          <FilterChip active={dept === ""} onClick={() => setDept("")}>
            {t("cta.viewAll")}
          </FilterChip>
          {(departments ?? []).map((d) => (
            <FilterChip key={d.id} active={dept === d.code} onClick={() => setDept(d.code)}>
              {d.code}
            </FilterChip>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (teachers ?? []).length === 0 ? (
          <EmptyState icon={<UserRound className="h-10 w-10 opacity-40" />} message="No faculty members found." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(teachers ?? []).map((tc, i) => (
              <Reveal key={tc.id} delay={Math.min(i, 8) * 0.04}>
                <Link
                  to={`/teachers/${tc.id}`}
                  className="group flex h-full flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  {tc.profilePhoto ? (
                    <img src={tc.profilePhoto} alt={tc.fullNameEnglish} className="h-24 w-24 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                      {initials(tc.fullNameEnglish)}
                    </div>
                  )}
                  <h2 className="mt-4 font-semibold text-foreground group-hover:text-primary">
                    {locale === "bn" && tc.fullNameBangla ? tc.fullNameBangla : tc.fullNameEnglish}
                  </h2>
                  <p className="text-sm text-primary">{tc.designation}</p>
                  {tc.department_name && <p className="mt-1 text-xs capitalize text-muted-foreground">{tc.department_name}</p>}
                  <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                    {tc.officeLocation && (
                      <span className="flex items-center justify-center gap-1"><MapPin className="h-3 w-3" /> {tc.officeLocation}</span>
                    )}
                    {tc.email && (
                      <span className="flex max-w-[15rem] items-center justify-center gap-1 truncate"><Mail className="h-3 w-3" /> {tc.email}</span>
                    )}
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
