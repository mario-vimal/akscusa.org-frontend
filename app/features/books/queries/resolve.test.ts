import { describe, expect, it } from "vitest";

import { checkUniqueIsbns, resolveReadings } from "./resolve";

interface Book {
  id: string;
  isbn?: string;
}

interface Reading {
  id: string;
  book?: string;
}

const book = (id: string, isbn?: string): Book => ({ id, isbn });
const reading = (id: string, book?: string): Reading => ({ id, book });

describe("checkUniqueIsbns", () => {
  it("allows every book to keep a distinct ISBN", () => {
    const books = [book("annihilation-of-caste", "9788189059637")];
    expect(() => checkUniqueIsbns(books, (entry) => entry.isbn)).not.toThrow();
  });

  it("throws when two books claim the same ISBN, naming both", () => {
    const books = [
      book("annihilation-of-caste", "9788189059637"),
      book("riddles-in-hinduism", "9788189059637"),
    ];
    expect(() => checkUniqueIsbns(books, (entry) => entry.isbn)).toThrow(
      /annihilation-of-caste.*riddles-in-hinduism/,
    );
  });

  it("lets any number of books have no ISBN at all", () => {
    // A pamphlet and a PDF of an out-of-print text both lack an ISBN, and
    // that is not the two of them claiming the same one.
    const books = [book("a-pamphlet"), book("an-out-of-print-text")];
    expect(() => checkUniqueIsbns(books, (entry) => entry.isbn)).not.toThrow();
  });
});

describe("resolveReadings", () => {
  const buffalo = book("buffalo-nationalism", "9788185604695");
  const annihilation = book("annihilation-of-caste", "9788189059637");
  const draftBook = book("why-were-women-enslaved", "9798190357936");

  it("resolves a reading to the book its slug names", () => {
    const readings = [reading("2026-08-31-buffalo", "buffalo-nationalism")];
    const { bookOfReading, readingsOfBook } = resolveReadings(
      [buffalo, annihilation],
      [buffalo, annihilation],
      readings,
      (r) => r.book,
    );

    expect(bookOfReading.get("2026-08-31-buffalo")).toBe(buffalo);
    expect(readingsOfBook.get("buffalo-nationalism")).toEqual(readings);
  });

  it("keeps resolving a reading after the book's ISBN changes", () => {
    // Correcting a book's ISBN does not change its slug, so a reading that
    // names the slug is unaffected: this is the scenario the migration from
    // ISBN-keyed to slug-keyed relations exists to fix.
    const correctedIsbn = { ...buffalo, isbn: "9789353282585" };
    const readings = [reading("2026-08-31-buffalo", "buffalo-nationalism")];

    const { bookOfReading } = resolveReadings(
      [correctedIsbn, annihilation],
      [correctedIsbn, annihilation],
      readings,
      (r) => r.book,
    );

    expect(bookOfReading.get("2026-08-31-buffalo")).toBe(correctedIsbn);
  });

  it("leaves a reading with no book unresolved", () => {
    const readings = [reading("palestine-reading-list")];
    const { bookOfReading, readingsOfBook } = resolveReadings(
      [buffalo],
      [buffalo],
      readings,
      (r) => r.book,
    );

    expect(bookOfReading.size).toBe(0);
    expect(readingsOfBook.size).toBe(0);
  });

  it("throws a clear error when a reading names a slug no book has", () => {
    const readings = [reading("orphaned-reading", "no-such-book")];
    expect(() =>
      resolveReadings([buffalo], [buffalo], readings, (r) => r.book),
    ).toThrow(/orphaned-reading.*no-such-book/);
  });

  it("resolves a reading to nothing when its book is only a draft, without failing", () => {
    // `all` includes the drafted book so it still counts as "known", but
    // `published` leaves it out, so a reading naming it renders without one.
    const readings = [
      reading("women-enslaved-reading", "why-were-women-enslaved"),
    ];
    const { bookOfReading, readingsOfBook } = resolveReadings(
      [buffalo, draftBook],
      [buffalo],
      readings,
      (r) => r.book,
    );

    expect(bookOfReading.has("women-enslaved-reading")).toBe(false);
    expect(readingsOfBook.size).toBe(0);
  });
});
