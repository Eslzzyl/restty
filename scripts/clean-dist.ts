import { rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
