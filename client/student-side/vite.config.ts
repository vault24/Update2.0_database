import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [
    react(),
    // Progressive Web App. injectManifest mode: we ship our own hand-written
    // service worker (src/sw.ts) — Workbox only injects the revision-aware
    // precache list into it. We register the SW manually in React (for a custom
    // update prompt) and ship our own public/manifest.webmanifest, so the
    // plugin generates neither.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false, // registered manually in src/pwa/registerSW.ts
      manifest: false, // we ship public/manifest.webmanifest ourselves
      injectManifest: {
        // Precache the app shell: all JS/CSS/HTML + SVG + icons + the manifest.
        // Big raster media (covers, illustrations) and iOS splash screens are
        // intentionally NOT precached — they are runtime-cached on first use.
        globPatterns: ["**/*.{js,css,html,ico,svg,webmanifest}", "icons/**/*.png"],
        globIgnores: [
          "**/*.map",
          "splash/**",
          "screenshots/**",
          // Heavy, click-time-only chunks (PDF / Excel export). They are
          // dynamically imported, so they stay out of the install-time precache
          // and are runtime-cached (SWR) the first time a user actually exports.
          "assets/vendor-pdf-*.js",
          "assets/vendor-xlsx-*.js",
          "assets/html2canvas*.js",
          "assets/index.es-*.js",
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false, // never run the SW against the Vite dev server
      },
    }),
  ];

  // The Lovable dev tagger is a development-only helper. We load it lazily and
  // only in development, wrapped in try/catch, so that:
  //   * a production build never imports it, and
  //   * a production-only install (`npm install --omit=dev`) or a server where
  //     the package failed to install can never break `npm run build`.
  if (mode === "development") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger());
    } catch {
      // lovable-tagger is optional — ignore if it is not installed.
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    // Strip all console.* and debugger statements from production builds so no
    // user/profile data is ever leaked to the browser console in production.
    // Development builds keep them for debugging.
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        // Two HTML entries: the student-portal SPA (index.html) and the
        // public BTEB result portal (result.html → result.spisg.gov.bd).
        // Both build into one dist/ and share hashed asset chunks.
        input: {
          main: path.resolve(__dirname, "index.html"),
          result: path.resolve(__dirname, "result.html"),
        },
        output: {
          // Split large, rarely-changing vendor libraries into their own chunks
          // so they cache independently and don't bloat the entry bundle.
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-charts": ["recharts"],
            "vendor-pdf": ["jspdf", "jspdf-autotable"],
            "vendor-xlsx": ["xlsx"],
            "vendor-motion": ["framer-motion"],
          },
        },
      },
    },
  };
});
