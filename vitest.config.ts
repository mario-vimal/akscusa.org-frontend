import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `~/*` path in tsconfig.json, which Astro's own build
      // resolves without help. Tests run under plain Vite, so the alias is
      // repeated here for anything under `scripts/` that imports app code.
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
