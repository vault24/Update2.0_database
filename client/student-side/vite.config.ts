import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
