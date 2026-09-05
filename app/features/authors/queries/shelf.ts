/**
 * Every author on the circle's reading list, with their published books.
 *
 * An author's page exists because the relation runs both ways: a book names
 * several authors and an author carries several books, and only one of those
 * two directions has a page anywhere else on the site.
 */
import {
  loadBooksWithReadings,
  type BookWithReadings,
} from "~/features/books/queries/books";
import { byLatestSession } from "~/features/authors/shelf";
import type { Author } from "./authors";

/** An author and every published book of theirs on the reading list. */
export interface AuthorShelf {
  author: Author;
  books: BookWithReadings[];
}

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
    books: [...shelf.books].sort(byLatestSession),
  }));
}
