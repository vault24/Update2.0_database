import { Link } from "react-router-dom";
import { Images } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useGallery } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function GalleryPage() {
  const { data, isLoading } = useGallery();
  const { t, pick } = useI18n();

  return (
    <>
      <PageHeader title={t("section.gallery")} crumbs={[{ label: t("nav.gallery") }]} />
      <Container className="section">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<Images className="h-10 w-10 opacity-40" />} message="No albums published yet." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {(data ?? []).map((a, i) => (
              <Reveal key={a.id} delay={Math.min(i, 8) * 0.03}>
                <Link to={`/gallery/${a.slug}`} className="group relative block overflow-hidden rounded-2xl border border-border">
                  {a.cover_image ? (
                    <img src={a.cover_image} alt={pick(a, "title")} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="grid h-44 w-full place-items-center bg-primary-soft text-primary/40"><Images className="h-9 w-9" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="truncate text-sm font-semibold">{pick(a, "title")}</p>
                    <p className="text-xs text-white/70">{a.image_count} photos</p>
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
