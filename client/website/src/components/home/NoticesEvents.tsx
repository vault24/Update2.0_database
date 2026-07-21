import { Link } from "react-router-dom";
import { ArrowRight, Bell, CalendarDays, MapPin, Paperclip } from "lucide-react";
import { useNotices, useEvents } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  normal: "bg-primary-soft text-primary",
  low: "bg-muted text-muted-foreground",
};

export function NoticesEvents() {
  const { data: notices, isLoading: nLoading } = useNotices();
  const { data: events, isLoading: eLoading } = useEvents({ when: "upcoming" });
  const { t, pick, locale } = useI18n();

  return (
    <section className="section bg-surface">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Notices */}
          <div>
            <SectionHeading
              eyebrow={t("nav.notices")}
              title={t("section.notices")}
              align="left"
              action={
                <Link to="/notices"><Button variant="ghost" size="sm">{t("cta.viewAll")} <ArrowRight className="h-4 w-4" /></Button></Link>
              }
            />
            <div className="space-y-3">
              {nLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              {!nLoading && (notices ?? []).length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("notice.empty")}</p>
              )}
              {(notices ?? []).slice(0, 5).map((n) => (
                <Link
                  key={n.id}
                  to={`/notices/${n.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-lift"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground group-hover:text-primary">{n.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {formatDate(n.created_at)}
                      {n.attachments.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" /> {n.attachments.length}</span>}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase", PRIORITY_STYLES[n.priority])}>
                    {n.priority}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Events */}
          <div>
            <SectionHeading
              eyebrow={t("nav.events")}
              title={t("section.events")}
              align="left"
              action={
                <Link to="/events"><Button variant="ghost" size="sm">{t("cta.viewAll")} <ArrowRight className="h-4 w-4" /></Button></Link>
              }
            />
            <div className="space-y-3">
              {eLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              {!eLoading && (events ?? []).length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("events.empty")}</p>
              )}
              {(events ?? []).slice(0, 4).map((ev) => {
                const d = ev.start_at ? new Date(ev.start_at) : null;
                return (
                  <Link
                    key={ev.id}
                    to={`/events/${ev.slug}`}
                    className="group flex gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-lift"
                  >
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <span className="text-2xl font-bold leading-none">{d ? d.getDate() : "—"}</span>
                      <span className="text-[0.65rem] uppercase">{d ? d.toLocaleString(locale, { month: "short" }) : ""}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-primary">{ev.category}</span>
                      <p className="mt-1 truncate font-medium text-foreground group-hover:text-primary">{pick(ev, "title")}</p>
                      <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(ev.start_at)}</span>
                        {ev.venue && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {ev.venue}</span>}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
