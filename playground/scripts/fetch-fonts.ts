import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const here = resolve(import.meta.dirname);
const root = resolve(here, "..", "..");
const fontsDir = resolve(root, "playground/public/fonts");
const jbTarget = resolve(fontsDir, "JetBrainsMono-Regular.ttf");
const nerdTarget = resolve(fontsDir, "SymbolsNerdFontMono-Regular.ttf");
const nerdLicenseTarget = resolve(fontsDir, "NerdFontsSymbolsOnly.LICENSE");
const openmojiTarget = resolve(fontsDir, "OpenMoji-black-glyf.ttf");

const jbUrl =
  "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf";
const nerdUrl = "https://deps.files.ghostty.org/NerdFontsSymbolsOnly-3.4.0.tar.gz";
const openmojiUrl =
  "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/font/OpenMoji-black-glyf/OpenMoji-black-glyf.ttf";

await mkdir(fontsDir, { recursive: true });

async function downloadFile(url: string, target: string) {
  if (existsSync(target)) {
    console.log("Font already present:", target);
    return;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download font: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  console.log("Downloaded font to:", target);
}

await downloadFile(jbUrl, jbTarget);
await downloadFile(openmojiUrl, openmojiTarget);

if (existsSync(nerdTarget)) {
  console.log("Nerd font already present:", nerdTarget);
  process.exit(0);
}

const nerdResp = await fetch(nerdUrl);
if (!nerdResp.ok) {
  throw new Error(`Failed to download nerd font: ${nerdResp.status} ${nerdResp.statusText}`);
}
const nerdBuffer = Buffer.from(await nerdResp.arrayBuffer());
const tarPath = resolve(fontsDir, "NerdFontsSymbolsOnly-3.4.0.tar.gz");
await writeFile(tarPath, nerdBuffer);

const proc = spawnSync("tar", ["-xf", tarPath, "-C", fontsDir, "./SymbolsNerdFontMono-Regular.ttf", "./LICENSE"]);
if (proc.status !== 0) {
  throw new Error(`tar exited with code ${proc.status}`);
}

const licenseSrc = resolve(fontsDir, "LICENSE");
if (existsSync(licenseSrc)) {
  await rename(licenseSrc, nerdLicenseTarget);
}
await unlink(tarPath);
console.log("Downloaded nerd font to:", nerdTarget);
