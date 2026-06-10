# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the TypeScript library code and package entrypoints (`src/index.ts`, `src/internal.ts`, `src/xterm.ts`).
- Core modules under `src/`:
- `surface/`: public `Restty` API, pane orchestration, plugin runtime/dispatch.
- `runtime/`: terminal runtime (`create-runtime`), render loop/ticks, interaction lifecycle, atlas helpers.
- `renderer/`: shaders, glyph/shape drawing, WebGPU/WebGL setup.
- `input/` and `pty/`: ANSI/input mapping, PTY integration, Kitty protocol/media helpers.
- `fonts/` and `theme/`: font source/picker logic and theme catalog/builtin theme integration.
- `wasm/`: embedded wasm bridge and runtime ABI helpers.
- `selection/`, `ime/`, `grid/`, `unicode/`, `utils/`, and `xterm/`: supporting subsystems and compatibility layers.
- `tests/` contains Vitest tests (`*.test.ts`).
- `scripts/` contains build/dev helpers (`build-lib`, `build-wasm`, `generate-builtin-themes`, `playground-dev`, `setup-wgpu-polyfill`).
- `playground/` hosts the local demo app and static assets (`playground/public/`).
- `assets/themes/` (with `assets/themes/manifest.json`) is the source for generated builtin themes.
- `wasm/` contains Zig sources/build config for the terminal core.
- `docs/` holds usage and internals documentation.
- `reference/` is upstream/reference material (including Ghostty source and text-shaper source code); check there when you need to inspect them, and avoid routine edits.

## Build, Test, and Development Commands
Requires **Node.js >=20.19.0** and **pnpm**.

- `pnpm install`: install dependencies.
- `pnpm run setup:wgpu-polyfill`: bootstrap local `wgpu-polyfill` artifacts when missing.
- `pnpm run clean:dist`: reset `dist/`.
- `pnpm run build:themes`: regenerate `src/theme/builtin-themes.ts` from `assets/themes/manifest.json`.
- `pnpm run build:wasm`: build Zig wasm module and regenerate `src/wasm/embedded.ts`.
- `pnpm run build:lib`: bundle ESM library entrypoints into `dist/` via Vite 8.
- `pnpm run build:types`: emit declaration files with `tsc`.
- `pnpm run build`: generate themes, build JS bundle, and emit type declarations into `dist/`.
- `pnpm run build:playground-app`: bundle playground application assets.
- `pnpm run build:assets`: alias for playground app build.
- `pnpm run check:themes`: verify generated themes are up to date.
- `pnpm run lint`: run `oxlint` across `src`, `playground`, `scripts`, and `tests`.
- `pnpm run format:check`: check formatting with `oxfmt`.
- `pnpm run format`: apply formatting fixes.
- `pnpm test`: run full test suite with Vitest.
- `pnpm run test:ci`: CI-safe suite (excludes `webgpu-glyph.test.ts`).
- `pnpm run playground`: start local playground workflow (PTY + Vite dev server).
- `pnpm run pty`: start PTY websocket server only.
- `pnpm run playground:static`: serve static playground files via Vite preview.

## Coding Style & Naming Conventions
- TypeScript ESM with 2-space indentation, semicolons, trailing commas, and double quotes (see `.oxfmtrc.json`).
- File names use kebab-case (example: `pane-app-manager.ts`).
- Use `PascalCase` for exported types/classes and `camelCase` for functions/variables.
- Keep public exports intentional in `src/index.ts`.
- Do not manually edit generated `src/theme/builtin-themes.ts`; run `pnpm run build:themes` instead.
- Do not manually edit generated `src/wasm/embedded.ts`; run `pnpm run build:wasm` instead.

## Testing Guidelines
- Framework: `vitest`.
- Place tests in `tests/` and name files `<feature>.test.ts`.
- Write behavior-driven test names (for example, `mapKeyForPty normalizes ...`).
- Add regression tests for any renderer/input/theme/font behavior change.
- Run focused checks with `pnpm vitest run tests/input-keymap.test.ts` (or another target file) before the full suite.

## Commit & Pull Request Guidelines
- Preferred commit format follows existing history: `feat:`, `fix(scope):`, `docs:`, `test:`, `chore:`.
- Keep commits scoped to one logical change.
- PRs should include:
  - a short impact summary,
  - linked issue(s),
  - validation commands run (`pnpm run lint`, `pnpm run format:check`, relevant tests),
  - screenshots/GIFs for playground or rendering-visible changes.
