/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import os from "os";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const apiProxyTarget =
    process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3333";

  return {
    cacheDir: path.join(os.tmpdir(), "vite-cache"),
    server: {
      host: "::",
      port: 8080,
      // Docker Desktop no Windows (e pastas no OneDrive) não propaga inotify:
      // sem polling o HMR/reload fica atrasado ou “preso” em versão antiga.
      watch: {
        usePolling: true,
        interval: 500,
      },
      hmr: {
        clientPort: 8080,
      },
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(
      Boolean,
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});
