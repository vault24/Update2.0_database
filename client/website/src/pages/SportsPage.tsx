import { Trophy } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useSports } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function SportsPage() {
  const { data, isLoading } = useSports();
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader title={t("nav.sports")} crumbs={[{ label: t("nav.campusLife") }, { label: t("nav.sports") }]} />
      <Container className="section">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<Trophy className="h-10 w-10 opacity-40" />} message="Sports information is being prepared." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((sp, i) => (
              <Reveal key={sp.id} delay={Math.min(i, 6) * 0.05}>
                <article className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                  {sp.image ? (
                    <img src={sp.image} alt="" className="h-44 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-44 w-full place-items-center bg-primary-soft text-primary/40"><Trophy className="h-10 w-10" /></div>
                  )}
                  <div className="p-5">
                    <h2 className="font-semibold text-foreground">{pick(sp, "title")}</h2>
                    {pick(sp, "description") && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{pick(sp, "description")}</p>}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
