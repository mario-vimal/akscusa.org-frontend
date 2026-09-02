import type { ImageMetadata } from "astro";

import { coverForIsbn } from "~/features/books/covers";
import { bookAuthors } from "~/features/books/presenters";
import {
  bookHref,
  loadReadingBooks,
  type Book,
} from "~/features/books/queries/books";
import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import { shelve, type HeldSession } from "~/features/home/shelf";
import { isUpcoming } from "~/lib/collections";

/** One book on the homepage shelf. */
export interface ShelfBook {
  id: string;
  title: string;
  /** Absent for a book whose entry names no author. */
  authors?: string;
  href: string;
  cover?: ImageMetadata;
  /** AKSC's own note on the book, when the entry has one. */
  summary?: string;
  /** How many sessions the circle gave it. */
  sessions: number;
  /** The day of the last of those sessions. */
  lastReadOn: Date;
}

export interface Shelf {
  /** The books shown, most recently read first. */
  books: ShelfBook[];
  /** How many books the circle has read, including any beyond the shown ones. */
  read: number;
  /** How many sessions those books took, in total. */
  sessions: number;
}

/**
 * Every book the circle has worked through, most recently read first.
 *
 * A book is on the shelf once a session that read it has been held. A session
 * that is only scheduled is not evidence of a book read, and a book with no
 * sessions at all is a reading list rather than a record — both are on
 * `/books/`, which is the page that lists everything.
 *
 * The counts describe the whole shelf even when the band shows part of it, so
 * shortening the row cannot quietly change what the page claims.
 */
export async function loadShelf(limit = 12): Promise<Shelf> {
  const [readings, booksByReading] = await Promise.all([
    loadEditorialEntries("bookReadings"),
    loadReadingBooks(),
  ]);

  const held: HeldSession<Book>[] = readings
    .filter((reading) => !isUpcoming(reading))
    .flatMap((reading) => {
      const book = booksByReading.get(reading.id);
      return book ? [{ book, date: reading.data.date }] : [];
    });

  const entries = shelve(held);

  return {
    books: entries.slice(0, limit).map(({ book, sessions, lastReadOn }) => ({
      id: book.id,
      title: book.data.title,
      authors: bookAuthors(book),
      href: bookHref(book),
      cover: coverForIsbn(book.data.isbn),
      summary: book.data.summary,
      sessions,
      lastReadOn,
    })),
    read: entries.length,
    sessions: entries.reduce((total, entry) => total + entry.sessions, 0),
  };
}
