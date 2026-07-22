import { Link } from "react-router-dom";
import { Images, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useGallery, useSiteSettings } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { SITE } from "@/config/site";

export default function CampusPage() {
  const { data: s } = useSiteSettings();
  const { data: albums } = useGallery();
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader title={t("nav.campus")} crumbs={[{ label: t("nav.about"), to: "/about" }, { label: t("nav.campus") }]} />
      <Container className="section space-y-12">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-border shadow-card">
            <img src="/cover-image1.jpg" alt={`${SITE.shortName} campus`} className="max-h-[30rem] w-full object-cover" />
          </div>
        </Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-foreground/85">
            {pick(s ?? null, "about_short") || "A green, well-equipped campus in the heart of Sirajganj."}
          </p>
          {(s?.institute?.address || pick(s ?? null, "contact_address")) && (
            <p className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" /> {s?.institute?.address || pick(s ?? null, "contact_address")}
            </p>
          )}
        </div>

        {(albums ?? []).length > 0 && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="heading-serif text-2xl text-foreground">{t("section.gallery")}</h2>
              <Link to="/gallery"><Button variant="outline" size="sm">{t("cta.viewAll")}</Button></Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {(albums ?? []).slice(0, 4).map((a) => (
                <Link key={a.id} to={`/gallery/${a.slug}`} className="group relative block overflow-hidden rounded-2xl border border-border">
                  {a.cover_image ? (
                    <img src={a.cover_image} alt={pick(a, "title")} className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="grid h-40 w-full place-items-center bg-primary-soft text-primary/40"><Images className="h-8 w-8" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <p className="absolute bottom-2.5 left-3 right-3 truncate text-sm font-medium text-white">{pick(a, "title")}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
