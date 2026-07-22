import { useParams } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEvent } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/utils";

export default function EventDetailPage() {
  const { slug } = useParams();
  const { data: ev, isLoading } = useEvent(slug);
  const { t, pick } = useI18n();

  if (isLoading) {
    return <Container className="section"><Skeleton className="h-72" /></Container>;
  }
  if (!ev) {
    return <Container className="section"><EmptyState message="Event not found." /></Container>;
  }

  return (
    <>
      <PageHeader
        title={pick(ev, "title")}
        crumbs={[{ label: t("nav.events"), to: "/events" }, { label: pick(ev, "title") }]}
      />
      <Container className="section">
        <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {ev.cover_image && <img src={ev.cover_image} alt="" className="max-h-[26rem] w-full object-cover" />}
          <div className="p-6 sm:p-10">
            <div className="mb-6 flex flex-wrap gap-4 border-b border-border pb-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {formatDate(ev.start_at)}{ev.end_at ? ` – ${formatDate(ev.end_at)}` : ""}</span>
              {ev.venue && <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {ev.venue}</span>}
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold uppercase text-primary">{ev.category}</span>
            </div>
            <div className="whitespace-pre-line text-foreground/90">{pick(ev, "description") || "Details will be announced."}</div>
          </div>
        </article>
      </Container>
    </>
  );
}
