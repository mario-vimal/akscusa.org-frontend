import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reading } from "~/features/books/test-fixtures";
import {
  readingShelf,
  shelve as groupOntoShelf,
  type HeldSession,
} from "./shelf";

interface Book {
  id: string;
}

const book = (id: string): Book => ({ id });

const session = (book: Book, date: string): HeldSession<Book> => ({
  book,
  date: new Date(`${date}T00:00:00Z`),
});

/** The shelf is told how to read an id, so the test says it once. */
const shelve = (sessions: readonly HeldSession<Book>[]) =>
  groupOntoShelf(sessions, (book) => book.id);

describe("shelve", () => {
  const annihilation = book("annihilation-of-caste");
  const riddles = book("riddles-in-hinduism");
  const buffalo = book("buffalo-nationalism");

  it("puts a book on the shelf once, however many sessions read it", () => {
    const shelf = shelve([
      session(riddles, "2020-02-23"),
      session(riddles, "2020-03-15"),
      session(riddles, "2020-04-26"),
    ]);

    expect(shelf).toHaveLength(1);
    expect(shelf[0].book).toBe(riddles);
    expect(shelf[0].sessions).toBe(3);
  });

  it("dates a book by its last session rather than its first", () => {
    // A book read over months belongs where the circle finished it, or a long
    // book would sink down the shelf while it was still being worked through.
    const shelf = shelve([
      session(riddles, "2020-04-26"),
      session(riddles, "2020-02-23"),
    ]);

    expect(shelf[0].lastReadOn).toEqual(new Date("2020-04-26T00:00:00Z"));
  });

  it("orders the shelf most recently read first", () => {
    const shelf = shelve([
      session(annihilation, "2020-06-07"),
      session(riddles, "2020-02-23"),
      session(buffalo, "2026-08-31"),
    ]);

    expect(shelf.map((entry) => entry.book.id)).toEqual([
      "buffalo-nationalism",
      "annihilation-of-caste",
      "riddles-in-hinduism",
    ]);
  });

  it("is empty when nothing has been read yet", () => {
    expect(shelve([])).toEqual([]);
  });

  it("stabilizes books with equally dated last sittings", () => {
    const sessions = [
      session(riddles, "2020-06-07"),
      session(annihilation, "2020-06-07"),
    ];
    for (const entries of [sessions, [...sessions].reverse()]) {
      expect(shelve(entries).map((entry) => entry.book.id)).toEqual([
        "annihilation-of-caste",
        "riddles-in-hinduism",
      ]);
    }
  });
});

describe("readingShelf", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T07:00:00-07:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes yesterday's late Pacific session but not today's or future sessions", () => {
    const yesterday = reading("yesterday", "2026-09-04T19:00:00-07:00");
    const today = reading("today", "2026-09-05T00:30:00-07:00");
    const future = reading("future", "2026-09-19T15:00:00-07:00");
    const readings = [future, today, yesterday];
    const books = new Map(readings.map((entry) => [entry.id, book(entry.id)]));
    expect(readingShelf(readings, books, (entry) => entry.id)).toEqual([
      { book: book("yesterday"), sessions: 1, lastReadOn: yesterday.data.date },
    ]);
  });

  it("counts only held sittings when a book also has another session scheduled", () => {
    const held = reading("held", "2026-09-04T19:00:00-07:00");
    const planned = reading("planned", "2026-09-19T15:00:00-07:00");
    const volume = book("one-book");
    const books = new Map([
      [held.id, volume],
      [planned.id, volume],
    ]);
    expect(readingShelf([planned, held], books, (entry) => entry.id)).toEqual([
      { book: volume, sessions: 1, lastReadOn: held.data.date },
    ]);
  });

  it("omits unresolved or unpublished books and handles no readings", () => {
    const unpublished = reading("draft-session", "2026-09-04T19:00:00-07:00", {
      book: "draft",
    });
    expect(
      readingShelf([unpublished], new Map<string, Book>(), (entry) => entry.id),
    ).toEqual([]);
    expect(
      readingShelf([], new Map<string, Book>(), (entry) => entry.id),
    ).toEqual([]);
  });
});
