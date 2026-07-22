import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Images, PlayCircle, X } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAlbum } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function AlbumPage() {
  const { slug } = useParams();
  const { data: album, isLoading } = useAlbum(slug);
  const { t, pick } = useI18n();
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isLoading) {
    return <Container className="section"><Skeleton className="h-72" /></Container>;
  }
  if (!album) {
    return <Container className="section"><EmptyState message="Album not found." /></Container>;
  }

  return (
    <>
      <PageHeader
        title={pick(album, "title")}
        subtitle={pick(album, "description") || undefined}
        crumbs={[{ label: t("nav.gallery"), to: "/gallery" }, { label: pick(album, "title") }]}
      />
      <Container className="section">
        {album.images.length === 0 ? (
          <EmptyState icon={<Images className="h-10 w-10 opacity-40" />} message="No photos in this album yet." />
        ) : (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
            {album.images.map((img) =>
              img.video_url ? (
                <a
                  key={img.id}
                  href={img.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-2xl border border-border"
                >
                  {img.image && <img src={img.image} alt={img.caption_en} className="w-full object-cover" loading="lazy" />}
                  <span className="absolute inset-0 grid place-items-center bg-black/40">
                    <PlayCircle className="h-12 w-12 text-white" />
                  </span>
                </a>
              ) : (
                img.image && (
                  <button key={img.id} onClick={() => setLightbox(img.image)} className="block w-full overflow-hidden rounded-2xl border border-border">
                    <img src={img.image} alt={img.caption_en} className="w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                  </button>
                )
              ),
            )}
          </div>
        )}
      </Container>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <button className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <motion.img
              src={lightbox}
              alt=""
              className="max-h-[88vh] max-w-full rounded-xl object-contain"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
