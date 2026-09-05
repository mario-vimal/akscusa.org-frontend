import { getCollection, type CollectionEntry } from "astro:content";

import type { EditorialEntry } from "~/features/editorial/sections";
import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import {
  resolveBookAuthors,
  type Author,
} from "~/features/authors/queries/authors";
import { byId, isPublished } from "~/lib/collections";
import { checkUniqueIsbns, resolveReadings } from "~/features/books/resolve";

export type Book = CollectionEntry<"books">;
export type Reading = EditorialEntry<"bookReadings">;

/**
 * A book together with the people who wrote it. The entry stores author slugs,
 * so nothing can print a byline without resolving them first; carrying the
 * resolved entries alongside the book means every page does that once.
 */
export interface BookWithAuthors {
  book: Book;
  authors: Author[];
}

/** A book, its authors, and every session that worked through it, newest first. */
export interface BookWithReadings extends BookWithAuthors {
  readings: Reading[];
}

const byTitle = (a: Book, b: Book) =>
  a.data.title.localeCompare(b.data.title, "en", { sensitivity: "base" }) ||
  byId(a, b);

async function loadBooks() {
  const all = (await getCollection("books")).sort(byTitle);

  checkUniqueIsbns(all, (book) => book.data.isbn);

  return { all, published: all.filter(isPublished) };
}

/**
 * Resolves the book each reading names, by the book's stable content-entry
 * id (its slug) rather than its ISBN. The id never changes when an editor
 * corrects a book's ISBN, so fixing a typo in one cannot sever a reading's
 * link to it. The authors each book names are resolved the same way and in
 * the same pass.
 */
async function resolve() {
  const [{ all, published }, readings] = await Promise.all([
    loadBooks(),
    loadEditorialEntries("bookReadings"),
  ]);

  const authorsOfBook = await resolveBookAuthors(all);

  const { bookOfReading, readingsOfBook } = resolveReadings(
    all,
    published,
    readings,
    (reading) => reading.data.book,
  );

  const withAuthors = (book: Book): BookWithAuthors => ({
    book,
    authors: authorsOfBook.get(book.id) ?? [],
  });

  return {
    books: published,
    readings,
    withAuthors,
    bookOfReading,
    readingsOfBook,
  };
}

/** Every book, each with the sessions that read it. Drives the books pages. */
export async function loadBooksWithReadings(): Promise<BookWithReadings[]> {
  const { books, withAuthors, readingsOfBook } = await resolve();

  return books.map((book) => ({
    ...withAuthors(book),
    readings: readingsOfBook.get(book.id) ?? [],
  }));
}

/** The published book each reading points at, with its authors, by reading ID. */
export async function loadReadingBooks(): Promise<
  Map<string, BookWithAuthors>
> {
  const { withAuthors, bookOfReading } = await resolve();

  return new Map(
    [...bookOfReading].map(([readingId, book]) => [
      readingId,
      withAuthors(book),
    ]),
  );
}
