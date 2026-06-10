import { defineConfig } from "vite";
import { resolve } from "node:path";

// Library build: code-split ESM bundles for the 3 entry points.
// Shared code is automatically extracted into shared chunks by Rolldown.
export default defineConfig({
  build: {
    lib: {
      entry: {
        restty: resolve(__dirname, "src/index.ts"),
        internal: resolve(__dirname, "src/internal.ts"),
        xterm: resolve(__dirname, "src/xterm.ts"),
      },
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      external: ["text-shaper"],
    },
  },
});
