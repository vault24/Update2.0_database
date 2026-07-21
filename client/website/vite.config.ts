import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Public website SPA (ac.spisg.gov.bd). Shares the Django backend; in dev we
// proxy /api and /media to the local backend so the app is same-origin (no CORS
// needed). In production the site is served from the same origin as its API.
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5200,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/media": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/files": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  esbuild: {
    // Never leak console output to the browser in production builds.
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-charts": ["recharts"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
}));
