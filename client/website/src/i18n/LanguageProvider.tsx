import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type DictKey, type Locale } from "./dict";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  /** Translate a UI key (falls back to English, then the key itself). */
  t: (key: DictKey) => string;
  /** Pick the locale-appropriate value from a paired `*_en` / `*_bn` object. */
  pick: <T extends Record<string, unknown>>(obj: T | null | undefined, base: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const STORAGE_KEY = "sgpi-locale";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === "bn" ? "bn" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggle = useCallback(() => setLocaleState((l) => (l === "en" ? "bn" : "en")), []);

  const t = useCallback(
    (key: DictKey): string => {
      const table = dict[locale] as Record<string, string>;
      return table[key] ?? (dict.en as Record<string, string>)[key] ?? key;
    },
    [locale],
  );

  const pick = useCallback(
    (obj: Record<string, unknown> | null | undefined, base: string): string => {
      if (!obj) return "";
      const bn = obj[`${base}_bn`];
      const en = obj[`${base}_en`];
      if (locale === "bn" && typeof bn === "string" && bn.trim()) return bn;
      return typeof en === "string" ? en : typeof bn === "string" ? bn : "";
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, toggle, t, pick }), [locale, setLocale, toggle, t, pick]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
