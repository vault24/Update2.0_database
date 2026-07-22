import type { ReactNode } from "react";
import { Landmark, Target, Eye, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useAnalytics, useSiteSettings } from "@/hooks/useApi";
import { Counter } from "@/components/ui/Counter";
import { useI18n } from "@/i18n/LanguageProvider";
import { SITE } from "@/config/site";

export default function AboutPage() {
  const { data: s, isLoading } = useSiteSettings();
  const { data: analytics } = useAnalytics();
  const { t, pick } = useI18n();

  const about = pick(s ?? null, "about_full") || pick(s ?? null, "about_short");
  const history = pick(s ?? null, "history");
  const mission = pick(s ?? null, "mission");
  const vision = pick(s ?? null, "vision");

  return (
    <>
      <PageHeader
        title={`${t("nav.about")} ${SITE.shortName}`}
        subtitle={s?.institute?.name || SITE.name}
        crumbs={[{ label: t("nav.about") }]}
      />
      <Container className="section space-y-12">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <Reveal>
                <div className="space-y-5">
                  {s?.established_year && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary">
                      <Landmark className="h-4 w-4" /> Established {s.established_year}
                    </span>
                  )}
                  <p className="whitespace-pre-line text-lg leading-relaxed text-foreground/85">
                    {about || "Content is being prepared. Please check back soon."}
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <img src="/cover-image1.jpg" alt="Campus" className="h-full max-h-96 w-full rounded-2xl border border-border object-cover shadow-card" />
              </Reveal>
            </div>

            {analytics && (
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {[
                  { label: t("stats.students"), value: analytics.students.current },
                  { label: t("stats.graduates"), value: analytics.students.graduated },
                  { label: t("stats.teachers"), value: analytics.teachers.total },
                  { label: t("stats.departments"), value: analytics.departments.total },
                ].map((x) => (
                  <div key={x.label} className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
                    <p className="text-3xl font-bold text-primary"><Counter to={x.value} /></p>
                    <p className="mt-1 text-sm text-muted-foreground">{x.label}</p>
                  </div>
                ))}
              </div>
            )}

            {history && (
              <InfoBlock icon={ScrollText} title={t("nav.history")}>
                <p className="whitespace-pre-line text-muted-foreground">{history}</p>
              </InfoBlock>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {mission && (
                <InfoBlock icon={Target} title="Mission">
                  <p className="whitespace-pre-line text-muted-foreground">{mission}</p>
                </InfoBlock>
              )}
              {vision && (
                <InfoBlock icon={Eye} title="Vision">
                  <p className="whitespace-pre-line text-muted-foreground">{vision}</p>
                </InfoBlock>
              )}
            </div>
          </>
        )}
      </Container>
    </>
  );
}

function InfoBlock({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}
