import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

const parentImports = {
  group: ["../**"],
  message: "Use the ~/ alias outside the current directory.",
};

export default defineConfig(
  // `.wrangler/` is Wrangler's own scratch space, written by `verify:pages`.
  // Its generated shims are not this repository's code to lint.
  globalIgnores([
    ".astro/",
    ".wrangler/",
    "dist/",
    "playwright-report/",
    "test-results/",
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
  {
    files: ["app/**/*.{ts,tsx,astro}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [parentImports],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "TSAsExpression[expression.type='TSAsExpression'][expression.typeAnnotation.type='TSUnknownKeyword']",
          message:
            "Carry the information needed to narrow this type instead of casting through unknown.",
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx,astro}"],
    ignores: ["app/features/**/queries/**", "app/lib/collections.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [parentImports],
          paths: [
            {
              name: "astro:content",
              importNames: ["getEntry", "getEntries", "getCollection"],
              message:
                "Read content in a feature's queries/ module, not in a route, component, or presenter.",
            },
          ],
        },
      ],
    },
  },
);
