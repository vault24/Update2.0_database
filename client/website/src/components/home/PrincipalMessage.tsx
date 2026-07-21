import { Quote } from "lucide-react";
import { useSiteSettings } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export function PrincipalMessage() {
  const { data } = useSiteSettings();
  const { t, pick } = useI18n();

  const message = pick(data ?? null, "principal_message");
  if (!message) return null;
  const name = pick(data ?? null, "principal_name");
  const designation = pick(data ?? null, "principal_designation") || "Principal";

  return (
    <section className="section">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="order-2 lg:order-1">
            <div className="relative mx-auto max-w-sm">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-glass">
                {data?.principal_photo ? (
                  <img src={data.principal_photo} alt={name} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid aspect-[4/5] w-full place-items-center bg-primary-soft text-primary">
                    <Quote className="h-16 w-16 opacity-40" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-4 left-6 right-6 rounded-2xl bg-primary px-5 py-3 text-primary-foreground shadow-lift">
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-accent">{designation}</p>
              </div>
            </div>
          </Reveal>

          <Reveal className="order-1 lg:order-2" delay={0.1}>
            <span className="eyebrow"><span className="h-px w-6 bg-accent" /> {t("section.principal")}</span>
            <Quote className="mt-4 h-10 w-10 text-accent/40" />
            <blockquote className="mt-2 whitespace-pre-line text-lg leading-relaxed text-foreground/90">
              {message}
            </blockquote>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
