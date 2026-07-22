import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFaq } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export default function FaqPage() {
  const { data, isLoading } = useFaq();
  const { pick } = useI18n();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <PageHeader title="Frequently Asked Questions" crumbs={[{ label: "FAQ" }]} />
      <Container className="section">
        {isLoading ? (
          <div className="mx-auto max-w-3xl space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<HelpCircle className="h-10 w-10 opacity-40" />} message="FAQs are being prepared." />
        ) : (
          <div className="mx-auto max-w-3xl space-y-3">
            {(data ?? []).map((f) => {
              const isOpen = open === f.id;
              return (
                <div key={f.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                  <button
                    onClick={() => setOpen(isOpen ? null : f.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-medium text-foreground hover:bg-muted/50"
                  >
                    {pick(f, "question")}
                    <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <p className="whitespace-pre-line border-t border-border px-6 py-4 text-muted-foreground">{pick(f, "answer")}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
