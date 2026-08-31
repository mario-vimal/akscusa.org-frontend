/**
 * What a book entry's file is called.
 *
 * The filename is the entry's content id, which is the last segment of the
 * book's URL, so it is the one thing about an entry that a reader sees and
 * that no catalogue supplies. An entry saved with no title has nothing to be
 * named after, and the CMS gives it a random id instead; once the ISBN yields
 * a title, this says what the file should have been called all along.
 */

import path from "node:path";

/**
 * The slug the CMS would have derived from this title, so a file renamed here
 * is named exactly as it would have been had the editor typed the title.
 * Accents are folded rather than dropped, so "Périyar" slugs as "periyar"
 * instead of "priyar".
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Where `file` belongs now that the book's title is known, or undefined when
 * it is already there and when the title slugs to nothing at all — a title
 * written in a script this transliteration does not cover would otherwise
 * rename the entry to its extension.
 */
export function renameTarget(file: string, title: string): string | undefined {
  const slug = slugify(title);

  if (slug === "") {
    return undefined;
  }

  const target = path.join(path.dirname(file), `${slug}${path.extname(file)}`);

  return target === file ? undefined : target;
}
