import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useEvents } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn, formatDate } from "@/lib/utils";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "", label: "All" },
] as const;

export default function EventsPage() {
  const [when, setWhen] = useState<string>("upcoming");
  const { data, isLoading } = useEvents(when ? { when } : undefined);
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader title={t("section.events")} crumbs={[{ label: t("nav.events") }]} />
      <Container className="section">
        <div className="mb-8 flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => setWhen(tab.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                when === tab.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-10 w-10 opacity-40" />} message={t("events.empty")} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((ev, i) => (
              <Reveal key={ev.id} delay={Math.min(i, 6) * 0.04}>
                <Link
                  to={`/events/${ev.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="relative h-40 bg-primary-soft">
                    {ev.cover_image ? (
                      <img src={ev.cover_image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-primary/40"><CalendarDays className="h-10 w-10" /></div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-card/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase text-primary backdrop-blur">
                      {ev.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <h2 className="font-semibold text-foreground group-hover:text-primary">{pick(ev, "title")}</h2>
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary" /> {formatDate(ev.start_at)}</span>
                      {ev.venue && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {ev.venue}</span>}
                    </p>
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
