import { parse } from "yaml";
import { z } from "astro/zod";

export function parseFrontmatter<Schema extends z.ZodType>(
  source: string,
  schema: Schema,
): z.output<Schema> {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
    source,
  )?.[1];

  if (frontmatter === undefined) {
    throw new Error("Expected YAML frontmatter delimited by ---.");
  }

  return schema.parse(parse(frontmatter, { merge: true }));
}
