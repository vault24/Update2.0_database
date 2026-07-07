import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [react()];

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
