import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Paperclip, Search } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotices } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn, formatDate } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  normal: "bg-primary-soft text-primary",
  low: "bg-muted text-muted-foreground",
};

const PRIORITIES = ["", "high", "normal", "low"] as const;

export default function NoticesPage() {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<string>("");
  const { data, isLoading } = useNotices(priority ? { priority } : undefined);
  const { t } = useI18n();

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter((n) => n.title.toLowerCase().includes(needle) || n.content.toLowerCase().includes(needle));
  }, [data, q]);

  return (
    <>
      <PageHeader title={t("section.notices")} crumbs={[{ label: t("nav.notices") }]} />
      <Container className="section">
        {/* Search + priority filter */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search.placeholder")}
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p || "all"}
                onClick={() => setPriority(p)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors",
                  priority === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {p || t("cta.viewAll")}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Bell className="h-10 w-10 opacity-40" />} message={t("notice.empty")} />
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <Link
                key={n.id}
                to={`/notices/${n.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-lift"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Bell className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-foreground group-hover:text-primary">{n.title}</h2>
                  <p className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                    {formatDate(n.created_at)}
                    {n.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {n.attachments.length}</span>
                    )}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase", PRIORITY_STYLES[n.priority])}>
                  {n.priority}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
