import { Award } from "lucide-react";
import { useAchievements } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { formatDate } from "@/lib/utils";

export function AchievementsPreview() {
  const { data } = useAchievements();
  const { t, pick } = useI18n();
  const items = (data ?? []).slice(0, 3);
  if (items.length === 0) return null; // stay hidden until content exists

  return (
    <section className="section bg-surface">
      <Container>
        <SectionHeading eyebrow={t("section.achievements")} title={t("section.achievements")} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.06}>
              <article className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                {a.image ? (
                  <img src={a.image} alt="" className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-40 w-full place-items-center bg-primary-soft">
                    <Award className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <div className="p-5">
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.65rem] font-semibold uppercase text-primary">
                    {a.category}
                  </span>
                  <h3 className="mt-3 font-semibold text-foreground">{pick(a, "title")}</h3>
                  {pick(a, "description") && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{pick(a, "description")}</p>
                  )}
                  {a.achieved_on && <p className="mt-3 text-xs text-muted-foreground">{formatDate(a.achieved_on)}</p>}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
