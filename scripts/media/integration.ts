import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

import { copyContentMedia } from "./copy.ts";
import { contentMediaDevPlugin } from "./dev.ts";

export function contentMedia(): AstroIntegration {
  let root: string | undefined;
  return {
    name: "colocated-content-media",
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        root = fileURLToPath(config.root);
        updateConfig({ vite: { plugins: [contentMediaDevPlugin({ root })] } });
      },
      "astro:build:done": async ({ dir, logger }) => {
        if (!root)
          throw new Error(
            "Content media integration has no configured source root.",
          );
        const assets = await copyContentMedia({
          root,
          outDir: fileURLToPath(dir),
        });
        logger.info(
          `Published ${assets.length} colocated/shared media assets.`,
        );
      },
    },
  };
}
