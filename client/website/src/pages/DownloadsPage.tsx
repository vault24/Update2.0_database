import { useState } from "react";
import { Download as DownloadIcon, FileDown } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDownloads } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "form", label: "Forms" },
  { key: "prospectus", label: "Prospectus" },
  { key: "calendar", label: "Academic Calendar" },
  { key: "syllabus", label: "Syllabus" },
  { key: "routine", label: "Routine" },
  { key: "policy", label: "Policy" },
  { key: "other", label: "Other" },
];

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsPage() {
  const [category, setCategory] = useState("");
  const { data, isLoading } = useDownloads(category ? { category } : undefined);
  const { t } = useI18n();

  return (
    <>
      <PageHeader title={t("section.downloads")} crumbs={[{ label: t("nav.downloads") }]} />
      <Container className="section">
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key || "all"}
              onClick={() => setCategory(c.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<FileDown className="h-10 w-10 opacity-40" />} message="No downloads available yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(data ?? []).map((d) => (
              <a
                key={d.id}
                href={d.file ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-lift"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileDown className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-foreground group-hover:text-primary">{d.title_en}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    <span className="capitalize">{d.category}</span>
                    {d.file_size ? ` · ${fmtSize(d.file_size)}` : ""}
                  </p>
                </div>
                <DownloadIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </a>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
