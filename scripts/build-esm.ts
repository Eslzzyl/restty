import { build } from "vite";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const distDir = resolve("dist");

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const entries: { input: string; name: string }[] = [
  { input: "src/index.ts", name: "restty.esm" },
  { input: "src/internal.ts", name: "internal.esm" },
  { input: "src/xterm.ts", name: "xterm.esm" },
];

console.log("Building standalone ESM bundles...\n");

let hasErrors = false;

for (const entry of entries) {
  try {
    await build({
      configFile: false,
      build: {
        lib: {
          entry: resolve(entry.input),
          formats: ["es"],
          fileName: () => `${entry.name}.js`,
        },
        outDir: distDir,
        emptyOutDir: false,
        minify: true,
        sourcemap: false,
        rollupOptions: {
          external: ["text-shaper"],
        },
      },
    });

    const outputPath = resolve(distDir, `${entry.name}.js`);
    const info = await stat(outputPath);
    console.log(`  ${entry.name}.js (${formatBytes(info.size)})`);
  } catch (err) {
    hasErrors = true;
    console.error(`FAIL  ${entry.name}.js`);
    console.error(err);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log("\nStandalone ESM bundles ready in dist/");
