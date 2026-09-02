/**
 * Every author the circle has read, with the books of theirs it has read.
 *
 * An author's page exists because the relation runs both ways: a book names
 * several authors and an author carries several books, and only one of those
 * two directions has a page anywhere else on the site.
 */
import {
  loadBooksWithReadings,
  type BookWithReadings,
} from "~/features/books/queries/books";
import type { Author } from "./authors";

/** An author, and every published book of theirs the circle has read. */
export interface AuthorShelf {
  author: Author;
  books: BookWithReadings[];
}

/** The most recent sitting on a book, or nothing when none is scheduled. */
const lastRead = (entry: BookWithReadings): number | undefined =>
  entry.readings.length === 0
    ? undefined
    : Math.max(...entry.readings.map((reading) => reading.data.date.getTime()));

/**
 * Most recently read first, then the books no session has covered yet.
 *
 * An author's page is a record of what the circle has done with their work,
 * and every other record on this site reads newest first. A book on the list
 * that has not been read yet is not the thing a reader came for, so it goes
 * below the ones that have, in title order among themselves.
 */
const byMostRecentlyRead = (a: BookWithReadings, b: BookWithReadings) => {
  const left = lastRead(a);
  const right = lastRead(b);

  if (left === undefined && right === undefined) {
    return a.book.data.title.localeCompare(b.book.data.title, "en", {
      sensitivity: "base",
    });
  }

  if (left === undefined) return 1;
  if (right === undefined) return -1;

  return right - left;
};

/**
 * Every author at least one published book names, with that book and any
 * others of theirs.
 *
 * An author no published book names gets no page. There is nothing to put on
 * it: an author entry carries a biography, and a biography with no reading
 * under it is a page about a person this site has no relation to. Reaching
 * such a page is impossible anyway, because a byline is the only way in.
 */
export async function loadAuthorShelves(): Promise<AuthorShelf[]> {
  const entries = await loadBooksWithReadings();
  const shelves = new Map<string, AuthorShelf>();

  for (const entry of entries) {
    for (const author of entry.authors) {
      const shelf = shelves.get(author.id) ?? { author, books: [] };
      shelf.books.push(entry);
      shelves.set(author.id, shelf);
    }
  }

  return [...shelves.values()].map((shelf) => ({
    ...shelf,
    books: [...shelf.books].sort(byMostRecentlyRead),
  }));
}
