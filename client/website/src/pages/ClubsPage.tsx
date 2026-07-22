import { Mail, Users } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useClubs } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function ClubsPage() {
  const { data, isLoading } = useClubs();
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader title={t("nav.clubs")} crumbs={[{ label: t("nav.campusLife") }, { label: t("nav.clubs") }]} />
      <Container className="section">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<Users className="h-10 w-10 opacity-40" />} message="Club information is being prepared." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i, 6) * 0.05}>
                <article className="h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                  <div className="flex items-center gap-4">
                    {c.logo ? (
                      <img src={c.logo} alt="" className="h-14 w-14 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-14 w-14 place-items-center rounded-xl bg-primary-soft text-primary"><Users className="h-7 w-7" /></span>
                    )}
                    <div>
                      <h2 className="font-semibold text-foreground">{pick(c, "name")}</h2>
                      {c.moderator && <p className="text-xs text-muted-foreground">Moderator: {c.moderator}</p>}
                    </div>
                  </div>
                  {pick(c, "description") && <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{pick(c, "description")}</p>}
                  {c.contact_email && (
                    <a href={`mailto:${c.contact_email}`} className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline">
                      <Mail className="h-4 w-4" /> {c.contact_email}
                    </a>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
