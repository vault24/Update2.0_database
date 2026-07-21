import { AnimatePresence, motion } from "framer-motion";
import { Search, X, GraduationCap, Building2, Bell, CalendarDays, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { useI18n } from "@/i18n/LanguageProvider";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const ICONS: Record<string, typeof Search> = {
  teacher: GraduationCap,
  department: Building2,
  notice: Bell,
  event: CalendarDays,
  download: FileDown,
};

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const data = await apiGet<{ results: SearchResult[] }>("/search/", { q });
        if (active) setResults(data.results);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [q]);

  const go = (url: string) => {
    onClose();
    navigate(url);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-primary/40 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search.placeholder")}
                className="h-14 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button onClick={onClose} aria-label="Close" className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {loading && <p className="p-4 text-sm text-muted-foreground">{t("loading")}</p>}
              {!loading && q.trim().length >= 2 && results.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">{t("search.empty")}</p>
              )}
              {results.map((r) => {
                const Icon = ICONS[r.type] ?? Search;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => go(r.url)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{r.title}</span>
                      <span className="block truncate text-xs capitalize text-muted-foreground">
                        {r.type} · {r.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
