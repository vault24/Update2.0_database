import { useParams } from "react-router-dom";
import { CalendarDays, Download, FileText, Share2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useNotice } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/utils";

export default function NoticeDetailPage() {
  const { id } = useParams();
  const { data: notice, isLoading } = useNotice(id);
  const { t } = useI18n();

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: notice?.title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (isLoading) {
    return (
      <Container className="section">
        <Skeleton className="h-72" />
      </Container>
    );
  }
  if (!notice) {
    return (
      <Container className="section">
        <EmptyState message="Notice not found." />
      </Container>
    );
  }

  const isImage = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

  return (
    <>
      <PageHeader
        title={notice.title}
        crumbs={[{ label: t("nav.notices"), to: "/notices" }, { label: `#${notice.id}` }]}
      />
      <Container className="section">
        <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-card sm:p-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" /> {formatDate(notice.created_at)}
            </p>
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          <div className="prose prose-neutral max-w-none whitespace-pre-line text-foreground/90">{notice.content}</div>

          {notice.attachments.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="mb-4 font-semibold text-foreground">Attachments</h2>
              <div className="space-y-4">
                {notice.attachments.map((a) =>
                  a.file && isImage(a.original_name || a.file) ? (
                    <img key={a.id} src={a.file} alt={a.original_name} className="max-h-[36rem] w-full rounded-xl border border-border object-contain" loading="lazy" />
                  ) : (
                    <a
                      key={a.id}
                      href={a.file ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {a.original_name || "Attachment"}
                      </span>
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  ),
                )}
              </div>
            </div>
          )}
        </article>
      </Container>
    </>
  );
}
