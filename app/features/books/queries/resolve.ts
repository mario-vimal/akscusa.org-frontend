/**
 * The pure half of linking a reading to the book it worked through.
 *
 * Kept apart from `books.ts` so it can be tested without `astro:content`,
 * which only exists inside an Astro build. Everything here takes plain
 * objects and a way to read the field it needs off them, and returns maps
 * keyed by id rather than reaching back into a collection itself.
 */

/** Enough of a book to check its ISBN and resolve readings against it. */
export interface ResolvableBook {
  id: string;
}

/** Enough of a reading to resolve it to the book it names, if any. */
export interface ResolvableReading {
  id: string;
}

/**
 * Two books sharing an ISBN would make a catalogue lookup ambiguous, so that
 * is caught here rather than silently resolving to whichever loaded first.
 * The clash is checked across every book, drafts included, so drafting one
 * cannot hide it.
 *
 * A book without an ISBN is skipped rather than treated as a book whose ISBN
 * is "missing": absence is not a value, and two pamphlets that both lack one
 * are not the same pamphlet. A book is identified by its slug, and this check
 * only guards the ISBN's own promise of naming a single edition.
 */
export function checkUniqueIsbns<B extends ResolvableBook>(
  books: readonly B[],
  isbnOf: (book: B) => string | undefined,
): void {
  const seen = new Map<string, string>();
  for (const book of books) {
    const isbn = isbnOf(book);
    if (!isbn) continue;

    const previous = seen.get(isbn);
    if (previous) {
      throw new Error(
        `ISBN ${isbn} is used by both "${previous}" and "${book.id}". An ISBN must identify one book.`,
      );
    }
    seen.set(isbn, book.id);
  }
}

export interface Resolution<B, R> {
  /** The book each reading points at, keyed by reading id. */
  bookOfReading: Map<string, B>;
  /** Every published book's readings, keyed by book id. */
  readingsOfBook: Map<string, R[]>;
}

/**
 * Resolves the book id on every reading in one pass.
 *
 * A reading pointing at a book id that no book claims is a broken link and
 * fails the build. A reading pointing at a book that is merely drafted is
 * not: the reading resolves to nothing, exactly as a reading with no book
 * does. A draft is unfinished, not missing, and toggling one in the CMS must
 * not take down a build that succeeds locally, where drafts are visible.
 */
export function resolveReadings<
  B extends ResolvableBook,
  R extends ResolvableReading,
>(
  all: readonly B[],
  published: readonly B[],
  readings: readonly R[],
  bookIdOf: (reading: R) => string | undefined,
): Resolution<B, R> {
  const known = new Set(all.map((book) => book.id));
  const byId = new Map(published.map((book) => [book.id, book]));

  const bookOfReading = new Map<string, B>();
  const readingsOfBook = new Map<string, R[]>();

  for (const reading of readings) {
    const bookId = bookIdOf(reading);
    if (!bookId) continue;

    if (!known.has(bookId)) {
      throw new Error(
        `Reading "${reading.id}" references book "${bookId}", which has no entry in cms/content/books.`,
      );
    }

    const book = byId.get(bookId);
    if (!book) continue;

    bookOfReading.set(reading.id, book);
    readingsOfBook.set(bookId, [
      ...(readingsOfBook.get(bookId) ?? []),
      reading,
    ]);
  }

  return { bookOfReading, readingsOfBook };
}
