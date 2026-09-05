/**
 * The shelf: which books the circle has actually finished with, and when.
 *
 * Kept apart from `queries/shelf.ts` so it can be tested without
 * `astro:content`, which only exists inside an Astro build. It takes plain
 * sessions that have already been paired with a book and filtered down to the
 * ones that were held.
 *
 * The distinction that matters here is the same one `loadCurrentBook` makes: a
 * reading is published weeks before it is held, so a shelf built from every
 * session would claim the circle has read a book it has only announced. What
 * goes on the shelf is what has been read.
 */

import { isUpcomingReading } from "~/features/book-readings/calendar";
import {
  byNewestFirst,
  type Dated,
  type Identified,
} from "~/lib/collection-policy";

/** A session that has been held, and the book it worked through. */
export interface HeldSession<B> {
  book: B;
  date: Date;
}

/** A book the circle has read, with the sessions it gave it. */
export interface ShelfEntry<B> {
  book: B;
  /** How many held sessions worked through this book. */
  sessions: number;
  /** The most recent of those sessions. */
  lastReadOn: Date;
}

/**
 * Groups held sessions by the book they read, most recently read first.
 *
 * A book read over several sessions appears once, dated by the last of them,
 * so a long book does not fill the shelf with copies of itself and does not
 * sit at the date the circle started it.
 *
 * How to read a book's id is asked for rather than assumed, because what a
 * caller holds is a book together with the people who wrote it, and the id it
 * is grouped by belongs to the entry inside that pair.
 */
export function shelve<B>(
  sessions: readonly HeldSession<B>[],
  idOf: (book: B) => string,
): ShelfEntry<B>[] {
  const byBook = new Map<string, ShelfEntry<B>>();

  for (const { book, date } of sessions) {
    const id = idOf(book);
    const entry = byBook.get(id);

    if (!entry) {
      byBook.set(id, { book, sessions: 1, lastReadOn: date });
      continue;
    }

    entry.sessions += 1;
    if (date.getTime() > entry.lastReadOn.getTime()) {
      entry.lastReadOn = date;
    }
  }

  return [...byBook.values()].sort((a, b) =>
    byNewestFirst(
      { id: idOf(a.book), data: { date: a.lastReadOn } },
      { id: idOf(b.book), data: { date: b.lastReadOn } },
    ),
  );
}

/** Only held Pacific-day sessions with published books belong on this shelf. */
export function readingShelf<R extends Dated & Identified, B>(
  readings: readonly R[],
  books: ReadonlyMap<string, B>,
  idOf: (book: B) => string,
): ShelfEntry<B>[] {
  const held = readings
    .filter((reading) => !isUpcomingReading(reading))
    .flatMap((reading) => {
      const book = books.get(reading.id);
      return book ? [{ book, date: reading.data.date }] : [];
    });
  return shelve(held, idOf);
}
