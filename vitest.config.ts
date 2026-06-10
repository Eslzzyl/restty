import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/webgpu-glyph.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    coverageEnabled: false,
  },
});
