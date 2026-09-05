import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { z } from "astro/zod";

import { cmsEntryId } from "~/schemas/shared";
import { parseFrontmatter } from "./frontmatter";

export function readContentCollection<Schema extends z.ZodType>(
  folder: string,
  schema: Schema,
) {
  const directory = fileURLToPath(
    new URL(`../../cms/content/${folder}/`, import.meta.url),
  );

  return globSync("**/*.md", { cwd: directory })
    .sort()
    .map((name) => {
      const source = readFileSync(`${directory}/${name}`, "utf8");
      return {
        id: cmsEntryId({ entry: name }),
        name,
        path: `cms/content/${folder}/${name}`,
        source,
        data: parseFrontmatter(source, schema),
      };
    });
}
