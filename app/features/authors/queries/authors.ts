/**
 * The authors collection, and the join from a book to the people who wrote it.
 *
 * A book stores its authors as slugs, so every byline on the site is resolved
 * here. Nothing in this module reads the books collection: it takes the book
 * entries it is given, so the books feature can depend on it without the two
 * depending on each other.
 */
import { getCollection, type CollectionEntry } from "astro:content";

import { isPublished } from "~/lib/collections";
import { resolvePublishedReferences } from "~/lib/references";

export type Author = CollectionEntry<"authors">;

/** Enough of a book to resolve the authors it names. */
export interface AuthoredEntry {
  id: string;
  data: { authors: readonly string[] };
}

/**
 * The published authors of every book, keyed by book id and in the order the
 * book names them, because a byline's order is a fact about the book.
 *
 * A slug no author entry claims is a broken link and fails the build. A slug
 * naming a drafted author resolves to nothing instead, exactly as a reading
 * pointing at a drafted book does: a draft is unfinished, not missing, and
 * toggling one in the CMS must not take down a build that succeeds locally,
 * where drafts are visible.
 *
 * References are checked across every book handed in, drafts included, so
 * drafting a book cannot hide a reference that is wrong.
 */
export async function resolveBookAuthors<Book extends AuthoredEntry>(
  books: readonly Book[],
): Promise<Map<string, Author[]>> {
  const all = await getCollection("authors");
  const known = new Set(all.map((author) => author.id));
  const published = new Map(
    all.filter(isPublished).map((author) => [author.id, author]),
  );

  const authorsOfBook = new Map<string, Author[]>();

  for (const book of books) {
    const resolved = resolvePublishedReferences(
      book.data.authors,
      known,
      published,
      (slug) =>
        new Error(
          `Book "${book.id}" references author "${slug}", which has no entry in cms/content/authors.`,
        ),
    );

    authorsOfBook.set(book.id, resolved);
  }

  return authorsOfBook;
}
