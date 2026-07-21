import { Link } from "react-router-dom";
import { ArrowRight, Images } from "lucide-react";
import { useGallery } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

export function GalleryPreview() {
  const { data } = useGallery();
  const { t, pick } = useI18n();
  const albums = (data ?? []).slice(0, 5);
  if (albums.length === 0) return null; // hidden until albums exist

  return (
    <section className="section">
      <Container>
        <SectionHeading
          eyebrow={t("nav.gallery")}
          title={t("section.gallery")}
          align="left"
          action={<Link to="/gallery"><Button variant="outline" size="sm">{t("cta.viewAll")} <ArrowRight className="h-4 w-4" /></Button></Link>}
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((a, i) => (
            <Link
              key={a.id}
              to={`/gallery/${a.slug}`}
              className={`group relative overflow-hidden rounded-2xl border border-border ${i === 0 ? "col-span-2 row-span-2 md:col-span-2" : ""}`}
            >
              {a.cover_image ? (
                <img src={a.cover_image} alt={pick(a, "title")} className="h-full min-h-[9rem] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="grid h-full min-h-[9rem] w-full place-items-center bg-primary-soft text-primary"><Images className="h-8 w-8" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="absolute bottom-3 left-3 right-3 truncate text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {pick(a, "title")}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
