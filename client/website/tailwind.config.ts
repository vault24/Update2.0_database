import type { Config } from "tailwindcss";

// Design tokens are declared as CSS variables in src/index.css and mapped here
// so `bg-primary`, `text-accent`, etc. resolve to the government-formal palette
// (deep institutional green + gold) and flip automatically in dark mode.
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1320px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        sans: ["Inter", "Hind Siliguri", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        bangla: ["Hind Siliguri", "Noto Sans Bengali", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px -8px hsl(var(--primary) / 0.18)",
        card: "0 1px 3px hsl(220 40% 10% / 0.06), 0 8px 24px -12px hsl(220 40% 10% / 0.12)",
        lift: "0 12px 40px -12px hsl(var(--primary) / 0.35)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(1200px 600px at 80% -10%, hsl(var(--accent) / 0.16), transparent), radial-gradient(900px 500px at 0% 0%, hsl(var(--primary) / 0.22), transparent)",
        "gold-line":
          "linear-gradient(90deg, transparent, hsl(var(--accent)), transparent)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        marquee: "marquee var(--marquee-duration, 30s) linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
