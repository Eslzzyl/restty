import { build } from "vite";
import { resolve } from "node:path";

const outDir = resolve("playground/public");

console.log("Building playground app...\n");

await build({ configFile: resolve("vite.playground.config.ts") });

console.log(`\nPlayground app bundle ready in ${outDir}/`);
