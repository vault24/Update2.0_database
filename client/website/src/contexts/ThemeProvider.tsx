import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Contrast = "normal" | "high";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  contrast: Contrast;
  toggleContrast: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_KEY = "sgpi-theme";
const CONTRAST_KEY = "sgpi-contrast";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    if (saved === "light" || saved === "dark") return saved;
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [contrast, setContrast] = useState<Contrast>(
    () => (localStorage.getItem(CONTRAST_KEY) === "high" ? "high" : "normal"),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (contrast === "high") root.setAttribute("data-contrast", "high");
    else root.removeAttribute("data-contrast");
    localStorage.setItem(CONTRAST_KEY, contrast);
  }, [contrast]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  const toggleContrast = useCallback(() => setContrast((c) => (c === "normal" ? "high" : "normal")), []);

  const value = useMemo(() => ({ theme, toggleTheme, contrast, toggleContrast }), [theme, toggleTheme, contrast, toggleContrast]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
