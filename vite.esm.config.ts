import { defineConfig } from "vite";
import { resolve } from "node:path";

// Standalone ESM bundles: each entry is fully self-contained (no shared chunks).
// Using manual chunks to keep per-entry isolation.
export default defineConfig({
  build: {
    lib: {
      entry: {
        "restty.esm": resolve(__dirname, "src/index.ts"),
        "internal.esm": resolve(__dirname, "src/internal.ts"),
        "xterm.esm": resolve(__dirname, "src/xterm.ts"),
      },
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    outDir: "dist",
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
    rollupOptions: {
      external: ["text-shaper"],
    },
  },
});
