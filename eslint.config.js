import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  // `.wrangler/` is Wrangler's own scratch space, written by `verify:pages`.
  // Its generated shims are not this repository's code to lint.
  globalIgnores([
    ".astro/",
    ".wrangler/",
    "dist/",
    "worker-configuration.d.ts",
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    files: ["*.mjs", "*.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
