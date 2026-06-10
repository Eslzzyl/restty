import { build } from "vite";
import { readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

const distRoot = resolve("dist");

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

console.log("Building library (code-split)...\n");

await build({});

// Collect all .js files in dist/ recursively
async function* walkJs(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJs(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      yield fullPath;
    }
  }
}

const entries: { path: string; size: number }[] = [];
for await (const fullPath of walkJs(distRoot)) {
  const info = await stat(fullPath);
  entries.push({ path: relative(distRoot, fullPath), size: info.size });
}

entries.sort((a, b) => a.path.localeCompare(b.path));

for (const entry of entries) {
  console.log(`  ${entry.path} (${formatBytes(entry.size)})`);
}

console.log("\nLibrary build complete.");
