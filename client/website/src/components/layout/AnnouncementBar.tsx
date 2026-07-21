import { Sparkles, ArrowRight } from "lucide-react";
import { useSiteSettings } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

/** Live announcement bar (e.g. admission open) — toggled from Website Settings. */
export function AnnouncementBar() {
  const { data } = useSiteSettings();
  const { pick } = useI18n();
  if (!data?.announcement_enabled) return null;
  const text = pick(data, "announcement");
  if (!text) return null;

  const Inner = (
    <div className="mx-auto flex max-w-[1320px] items-center justify-center gap-2 px-5 py-2 text-sm font-medium">
      <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      <span>{text}</span>
      {data.announcement_link && <ArrowRight className="h-4 w-4" />}
    </div>
  );

  return (
    <div className="border-b border-border bg-primary-soft text-primary">
      {data.announcement_link ? (
        <a href={data.announcement_link} className="block hover:bg-primary-soft/70" target="_blank" rel="noreferrer">
          {Inner}
        </a>
      ) : (
        Inner
      )}
    </div>
  );
}
