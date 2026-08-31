import { getCollection, type CollectionEntry } from "astro:content";

import { type EditorialEntry } from "~/features/editorial/sections";
import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import { isPublished } from "~/lib/collections";
import { checkUniqueIsbns, resolveReadings } from "./resolve";

export type Book = CollectionEntry<"books">;
export type Reading = EditorialEntry<"bookReadings">;

/** A book together with every session that worked through it, newest first. */
export interface BookWithReadings {
  book: Book;
  readings: Reading[];
}

const byTitle = (a: Book, b: Book) =>
  a.data.title.localeCompare(b.data.title, "en", { sensitivity: "base" });

async function loadBooks() {
  const all = (await getCollection("books")).sort(byTitle);

  checkUniqueIsbns(all, (book) => book.data.isbn);

  return { all, published: all.filter(isPublished) };
}

/**
 * Resolves the book each reading names, by the book's stable content-entry
 * id (its slug) rather than its ISBN. The id never changes when an editor
 * corrects a book's ISBN, so fixing a typo in one cannot sever a reading's
 * link to it.
 */
async function resolve() {
  const [{ all, published }, readings] = await Promise.all([
    loadBooks(),
    loadEditorialEntries("bookReadings"),
  ]);

  const { bookOfReading, readingsOfBook } = resolveReadings(
    all,
    published,
    readings,
    (reading) => reading.data.book,
  );

  return { books: published, readings, bookOfReading, readingsOfBook };
}

/** Every book, each with the sessions that read it. Drives the books pages. */
export async function loadBooksWithReadings(): Promise<BookWithReadings[]> {
  const { books, readingsOfBook } = await resolve();

  return books.map((book) => ({
    book,
    readings: readingsOfBook.get(book.id) ?? [],
  }));
}

/** The book each reading points at, keyed by reading id. */
export async function loadReadingBooks(): Promise<Map<string, Book>> {
  const { bookOfReading } = await resolve();
  return bookOfReading;
}

export const bookHref = (book: Book) => `/books/${book.id}/`;
