import { getCollection, type CollectionEntry } from "astro:content";

import {
  loadEditorialEntries,
  type EditorialEntry,
} from "../../editorial/entries";

export type Book = CollectionEntry<"books">;
export type Reading = EditorialEntry<"bookReadings">;

/** A book together with every session that worked through it, newest first. */
export interface BookWithReadings {
  book: Book;
  readings: Reading[];
}

const isPublished = (entry: { data: { draft: boolean } }) =>
  import.meta.env.DEV || !entry.data.draft;

const byTitle = (a: Book, b: Book) =>
  a.data.title.localeCompare(b.data.title, "en", { sensitivity: "base" });

/**
 * Two books sharing an ISBN would make the link ambiguous, so that is caught
 * here rather than silently resolving to whichever loaded first. The clash is
 * checked across every book, drafts included, so drafting one cannot hide it.
 */
async function loadBooks() {
  const all = (await getCollection("books")).sort(byTitle);

  const seen = new Map<string, string>();
  for (const book of all) {
    const previous = seen.get(book.data.isbn);
    if (previous) {
      throw new Error(
        `ISBN ${book.data.isbn} is used by both "${previous}" and "${book.id}". An ISBN must identify one book.`,
      );
    }
    seen.set(book.data.isbn, book.id);
  }

  return { all, published: all.filter(isPublished) };
}

/**
 * Resolves the ISBN on every reading in one pass.
 *
 * A reading pointing at an ISBN that no book claims is a broken link and fails
 * the build. A reading pointing at a book that is merely drafted is not: the
 * reading renders without its book, exactly as a reading with no ISBN does. A
 * draft is unfinished, not missing, and toggling one in the CMS must not take
 * down a build that succeeds locally, where drafts are visible.
 */
async function resolve() {
  const [{ all, published }, readings] = await Promise.all([
    loadBooks(),
    loadEditorialEntries("bookReadings"),
  ]);

  const known = new Set(all.map((book) => book.data.isbn));
  const byIsbn = new Map(published.map((book) => [book.data.isbn, book]));
  const bookOfReading = new Map<string, Book>();
  const readingsOfIsbn = new Map<string, Reading[]>();

  for (const reading of readings) {
    const { isbn } = reading.data;
    if (!isbn) continue;

    if (!known.has(isbn)) {
      throw new Error(
        `Reading "${reading.id}" references ISBN ${isbn}, which has no entry in cms/content/books.`,
      );
    }

    const book = byIsbn.get(isbn);
    if (!book) continue;

    bookOfReading.set(reading.id, book);
    readingsOfIsbn.set(isbn, [...(readingsOfIsbn.get(isbn) ?? []), reading]);
  }

  return { books: published, readings, bookOfReading, readingsOfIsbn };
}

/** Every book, each with the sessions that read it. Drives the books pages. */
export async function loadBooksWithReadings(): Promise<BookWithReadings[]> {
  const { books, readingsOfIsbn } = await resolve();

  return books.map((book) => ({
    book,
    readings: readingsOfIsbn.get(book.data.isbn) ?? [],
  }));
}

/** The book each reading points at, keyed by reading id. */
export async function loadReadingBooks(): Promise<Map<string, Book>> {
  const { bookOfReading } = await resolve();
  return bookOfReading;
}

export const bookHref = (book: Book) => `/books/${book.id}/`;
