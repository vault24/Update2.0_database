import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Briefcase, GraduationCap, Mail, MapPin, Sparkles } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTeacher } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function TeacherProfilePage() {
  const { id } = useParams();
  const { data: tc, isLoading } = useTeacher(id);
  const { t, locale } = useI18n();

  if (isLoading) {
    return (
      <Container className="section">
        <Skeleton className="h-80" />
      </Container>
    );
  }
  if (!tc) {
    return (
      <Container className="section">
        <EmptyState message="Faculty member not found." />
      </Container>
    );
  }

  const name = locale === "bn" && tc.fullNameBangla ? tc.fullNameBangla : tc.fullNameEnglish;

  return (
    <>
      <PageHeader
        title={name}
        subtitle={`${tc.designation}${tc.department_name ? ` · ${tc.department_name}` : ""}`}
        crumbs={[{ label: t("nav.teachers"), to: "/teachers" }, { label: tc.fullNameEnglish }]}
      />
      <Container className="section">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Left card */}
          <div className="h-fit rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            {tc.profilePhoto ? (
              <img src={tc.profilePhoto} alt={name} className="mx-auto h-36 w-36 rounded-full object-cover" />
            ) : (
              <div className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-primary text-4xl font-bold text-primary-foreground">
                {initials(tc.fullNameEnglish)}
              </div>
            )}
            <h2 className="mt-5 text-xl font-semibold text-foreground">{name}</h2>
            <p className="text-primary">{tc.designation}</p>
            {tc.headline && <p className="mt-2 text-sm text-muted-foreground">{tc.headline}</p>}
            <div className="mt-6 space-y-2.5 border-t border-border pt-5 text-left text-sm">
              {tc.email && (
                <a href={`mailto:${tc.email}`} className="flex items-center gap-2.5 text-muted-foreground hover:text-primary">
                  <Mail className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{tc.email}</span>
                </a>
              )}
              {tc.officeLocation && (
                <p className="flex items-center gap-2.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" /> {tc.officeLocation}
                </p>
              )}
            </div>
            {(tc.specializations?.length > 0 || tc.skills?.length > 0) && (
              <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-border pt-5">
                {[...(tc.specializations ?? []), ...(tc.skills ?? [])].slice(0, 8).map((s, i) => (
                  <span key={i} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">{String(s)}</span>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-8">
            {tc.about && (
              <ProfileSection icon={Sparkles} title="About">
                <p className="whitespace-pre-line text-muted-foreground">{tc.about}</p>
              </ProfileSection>
            )}
            {(tc.education ?? []).length > 0 && (
              <ProfileSection icon={GraduationCap} title="Education">
                <ol className="space-y-4">
                  {tc.education.map((e, i) => (
                    <li key={i} className="rounded-xl border border-border bg-surface p-4">
                      <p className="font-semibold text-foreground">{e.degree}</p>
                      <p className="text-sm text-muted-foreground">{e.institution}{e.field ? ` · ${e.field}` : ""}{e.year ? ` · ${e.year}` : ""}</p>
                    </li>
                  ))}
                </ol>
              </ProfileSection>
            )}
            {(tc.experiences ?? []).length > 0 && (
              <ProfileSection icon={Briefcase} title="Experience">
                <ol className="space-y-4">
                  {tc.experiences.map((e, i) => (
                    <li key={i} className="rounded-xl border border-border bg-surface p-4">
                      <p className="font-semibold text-foreground">{e.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.institution}{e.location ? ` · ${e.location}` : ""} · {e.startDate}–{e.current ? "Present" : e.endDate}
                      </p>
                      {e.description && <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>}
                    </li>
                  ))}
                </ol>
              </ProfileSection>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

function ProfileSection({ icon: Icon, title, children }: { icon: typeof Mail; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <h3 className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-foreground">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
        {title}
      </h3>
      {children}
    </section>
  );
}
