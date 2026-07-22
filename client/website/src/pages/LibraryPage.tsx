import { BookOpen, ExternalLink, FileDown } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useLibrary } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function LibraryPage() {
  const { data, isLoading } = useLibrary();
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader
        title={t("nav.library")}
        subtitle="Books, references and digital resources for students and faculty."
        crumbs={[{ label: t("nav.campusLife") }, { label: t("nav.library") }]}
      />
      <Container className="section">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<BookOpen className="h-10 w-10 opacity-40" />} message="Library resources are being prepared." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((r, i) => (
              <Reveal key={r.id} delay={Math.min(i, 6) * 0.05}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                  {r.cover_image && <img src={r.cover_image} alt="" className="h-40 w-full object-cover" loading="lazy" />}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-semibold text-foreground">{pick(r, "title")}</h2>
                    {pick(r, "description") && <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{pick(r, "description")}</p>}
                    <div className="mt-4 flex gap-4 text-sm">
                      {r.resource_url && (
                        <a href={r.resource_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" /> Visit
                        </a>
                      )}
                      {r.file && (
                        <a href={r.file} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                          <FileDown className="h-4 w-4" /> Download
                        </a>
                      )}
                    </div>
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
