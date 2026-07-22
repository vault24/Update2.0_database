import { useParams } from "react-router-dom";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNewsPost } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/utils";

export default function NewsDetailPage() {
  const { slug } = useParams();
  const { data: post, isLoading } = useNewsPost(slug);
  const { t, pick } = useI18n();

  if (isLoading) {
    return <Container className="section"><Skeleton className="h-72" /></Container>;
  }
  if (!post) {
    return <Container className="section"><EmptyState message="News post not found." /></Container>;
  }

  return (
    <>
      <PageHeader
        title={pick(post, "title")}
        subtitle={formatDate(post.published_at || post.created_at)}
        crumbs={[{ label: t("nav.news"), to: "/news" }, { label: pick(post, "title") }]}
      />
      <Container className="section">
        <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {post.cover_image && <img src={post.cover_image} alt="" className="max-h-[26rem] w-full object-cover" />}
          <div className="whitespace-pre-line p-6 text-foreground/90 sm:p-10">
            {pick(post, "body") || pick(post, "excerpt")}
          </div>
        </article>
      </Container>
    </>
  );
}
