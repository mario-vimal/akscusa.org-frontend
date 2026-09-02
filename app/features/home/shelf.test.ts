import { describe, expect, it } from "vitest";

import { shelve, type HeldSession } from "./shelf";

interface Book {
  id: string;
}

const book = (id: string): Book => ({ id });

const session = (book: Book, date: string): HeldSession<Book> => ({
  book,
  date: new Date(`${date}T00:00:00Z`),
});

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
});
