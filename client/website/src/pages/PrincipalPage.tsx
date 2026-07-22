import { Quote } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSiteSettings } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function PrincipalPage() {
  const { data: s, isLoading } = useSiteSettings();
  const { t, pick } = useI18n();

  const message = pick(s ?? null, "principal_message");
  const name = pick(s ?? null, "principal_name");
  const designation = pick(s ?? null, "principal_designation") || "Principal";

  return (
    <>
      <PageHeader title={t("nav.principal")} crumbs={[{ label: t("nav.about"), to: "/about" }, { label: t("nav.principal") }]} />
      <Container className="section">
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : !message ? (
          <EmptyState message="The principal's message is being prepared." />
        ) : (
          <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="mx-auto w-full max-w-xs">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-glass">
                {s?.principal_photo ? (
                  <img src={s.principal_photo} alt={name} className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[4/5] w-full place-items-center bg-primary-soft text-primary/40">
                    <Quote className="h-14 w-14" />
                  </div>
                )}
              </div>
              <div className="-mt-5 mx-4 rounded-2xl bg-primary px-5 py-3 text-center text-primary-foreground shadow-lift">
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-primary-foreground/75">{designation}</p>
              </div>
            </div>
            <article className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-10">
              <Quote className="h-10 w-10 text-primary/25" />
              <div className="mt-4 whitespace-pre-line text-lg leading-relaxed text-foreground/85">{message}</div>
              <p className="mt-8 border-t border-border pt-5 font-semibold text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{designation}, {s?.institute?.name}</p>
            </article>
          </div>
        )}
      </Container>
    </>
  );
}
