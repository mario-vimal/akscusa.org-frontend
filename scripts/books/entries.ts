/**
 * The book entries on disk, and the cover file each one is matched to.
 *
 * A cover is keyed by ISBN because `app/features/books/covers.ts` matches it to
 * a book by filename, so writing the file is the whole of wiring it up.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isValidIsbn13, normalizeIsbn } from "../../app/features/books/isbn.ts";
import { readFrontmatter } from "./frontmatter.ts";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

export const BOOKS_DIR = path.join(projectRoot, "cms/content/books");
export const COVERS_DIR = path.join(
  projectRoot,
  "app/features/books/assets/covers",
);

export interface BookEntry {
  /** Path relative to the project root, for a message a reader can act on. */
  label: string;
  file: string;
  isbn: string;
  title: string;
  source: string;
  data: Record<string, unknown>;
  /** Where this book's cover art belongs, whether or not it is there yet. */
  cover: string;
}

export async function readBookEntries(): Promise<BookEntry[]> {
  const names = (await readdir(BOOKS_DIR))
    .filter((name) => name.endsWith(".md"))
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const file = path.join(BOOKS_DIR, name);
      const label = path.join("cms/content/books", name);
      const source = await readFile(file, "utf8");
      const { data } = readFrontmatter(source, label);

      const isbn = normalizeIsbn(String(data.isbn ?? ""));

      // An unusable ISBN stops the run rather than being skipped quietly: it
      // would also fail the build, and the cause is clearer here.
      if (!isValidIsbn13(isbn)) {
        throw new Error(
          `${label} has no valid ISBN-13 (found ${JSON.stringify(data.isbn ?? null)}).`,
        );
      }

      return {
        label,
        file,
        isbn,
        title: typeof data.title === "string" ? data.title : label,
        source,
        data,
        cover: path.join(COVERS_DIR, `${isbn}.jpg`),
      };
    }),
  );
}
