import { Link } from "react-router-dom";
import { Newspaper } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useNews } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/utils";

export default function NewsPage() {
  const { data, isLoading } = useNews();
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader title={t("nav.news")} crumbs={[{ label: t("nav.news") }]} />
      <Container className="section">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<Newspaper className="h-10 w-10 opacity-40" />} message="No news published yet." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((n, i) => (
              <Reveal key={n.id} delay={Math.min(i, 6) * 0.04}>
                <Link
                  to={`/news/${n.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="h-40 bg-primary-soft">
                    {n.cover_image ? (
                      <img src={n.cover_image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-primary/40"><Newspaper className="h-10 w-10" /></div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-muted-foreground">{formatDate(n.published_at || n.created_at)}</p>
                    <h2 className="mt-1.5 font-semibold text-foreground group-hover:text-primary">{pick(n, "title")}</h2>
                    {pick(n, "excerpt") && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{pick(n, "excerpt")}</p>}
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
