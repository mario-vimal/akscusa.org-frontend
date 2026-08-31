/**
 * The book ids something else already names.
 *
 * A reading references its book by that book's content id, which is its
 * filename, so renaming a book file breaks every reading that names it — and a
 * reading naming a book no entry claims fails the build rather than degrading.
 * A tidier URL is not worth that, so a book already referenced keeps its name.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readFrontmatter } from "./frontmatter.ts";

const READINGS_DIR = fileURLToPath(
  new URL("../../cms/content/book-readings", import.meta.url),
);

export async function readReferencedBookIds(): Promise<Set<string>> {
  const names = (await readdir(READINGS_DIR)).filter((name) =>
    name.endsWith(".md"),
  );

  const ids = await Promise.all(
    names.map(async (name) => {
      const file = path.join(READINGS_DIR, name);
      const source = await readFile(file, "utf8");
      const { data } = readFrontmatter(source, name);

      return typeof data.book === "string" ? data.book : "";
    }),
  );

  return new Set(ids.filter((id) => id !== ""));
}
