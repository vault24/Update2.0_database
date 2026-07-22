import { ExternalLink, FileDown, FlaskConical } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useResearch } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  ongoing: "bg-primary-soft text-primary",
  completed: "bg-muted text-muted-foreground",
  published: "bg-primary text-primary-foreground",
};

export default function ResearchPage() {
  const { data, isLoading } = useResearch();
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader
        title={t("nav.projects")}
        subtitle="Research work and student/faculty projects across departments."
        crumbs={[{ label: t("nav.academics") }, { label: t("nav.projects") }]}
      />
      <Container className="section">
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<FlaskConical className="h-10 w-10 opacity-40" />} message="Research & project entries are being prepared." />
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            {(data ?? []).map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 6) * 0.04}>
                <article className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:border-primary/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", STATUS_STYLES[p.status] ?? STATUS_STYLES.ongoing)}>
                      {p.status}
                    </span>
                    {p.year && <span className="text-xs text-muted-foreground">{p.year}</span>}
                    {p.department_name && <span className="text-xs capitalize text-muted-foreground">· {p.department_name}</span>}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-foreground">{pick(p, "title")}</h2>
                  {p.authors && <p className="mt-1 text-sm text-muted-foreground">{p.authors}</p>}
                  {pick(p, "abstract") && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{pick(p, "abstract")}</p>}
                  {(p.link || p.file) && (
                    <div className="mt-4 flex gap-4 text-sm">
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" /> View
                        </a>
                      )}
                      {p.file && (
                        <a href={p.file} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                          <FileDown className="h-4 w-4" /> Paper
                        </a>
                      )}
                    </div>
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
