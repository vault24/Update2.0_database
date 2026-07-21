import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useNotices } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

/** Marquee of the latest published notices. Duplicated inline so the CSS
 *  translateX(-50%) loop is seamless. */
export function NoticeTicker() {
  const { data: notices } = useNotices();
  const { t } = useI18n();
  const items = (notices ?? []).slice(0, 8);
  if (items.length === 0) return null;

  const row = (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={false}>
      {items.map((n) => (
        <Link
          key={n.id}
          to={`/notices/${n.id}`}
          className="flex items-center gap-2 text-sm text-primary-foreground/90 hover:text-primary-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="whitespace-nowrap">{n.title}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="border-y border-white/10 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-5">
        <span className="flex shrink-0 items-center gap-2 py-2.5 pr-4 text-xs font-semibold uppercase tracking-wider">
          <Megaphone className="h-4 w-4 text-accent" /> {t("section.notices")}
        </span>
        <div className="group relative flex-1 overflow-hidden py-2.5 no-scrollbar">
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]" style={{ ["--marquee-duration" as string]: "34s" }}>
            {row}
            {row}
          </div>
        </div>
      </div>
    </div>
  );
}
