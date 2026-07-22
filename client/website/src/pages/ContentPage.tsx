import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePageContent } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/utils";

/** Generic admin-authored static page (Privacy, Terms, …) driven by PageContent. */
export default function ContentPage({ pageKey, fallbackTitle }: { pageKey: string; fallbackTitle: string }) {
  const { data, isLoading } = usePageContent(pageKey);
  const { pick } = useI18n();

  const title = (data && pick(data, "title")) || fallbackTitle;

  return (
    <>
      <PageHeader title={title} crumbs={[{ label: title }]} />
      <Container className="section">
        {isLoading ? (
          <Skeleton className="mx-auto h-72 max-w-3xl" />
        ) : !data ? (
          <EmptyState message={`${fallbackTitle} content is being prepared.`} />
        ) : (
          <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-card sm:p-10">
            <div className="whitespace-pre-line leading-relaxed text-foreground/90">{pick(data, "body")}</div>
            <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">Last updated {formatDate(data.updated_at)}</p>
          </article>
        )}
      </Container>
    </>
  );
}
