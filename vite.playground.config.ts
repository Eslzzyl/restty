import { defineConfig } from "vite";
import { resolve } from "node:path";

// Playground app build/dev config.
// Uses `playground/index.html` as the entry point (to be created).
export default defineConfig({
  root: resolve(__dirname, "playground"),
  base: "/",
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    outDir: resolve(__dirname, "playground/public"),
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, "playground/index.html"),
    },
  },
});
