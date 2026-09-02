/**
 * Everything the book readings page reads out of the content collections.
 *
 * The page is a list of sections and each section's component takes a view
 * model, so the loading, the join between a session and its book, and the
 * counting all happen here once rather than in four frontmatter blocks.
 */
import { loadReadingBooks } from "~/features/books/queries/books";
import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import {
  nextSession,
  readingEntries,
  type NextSession,
  type ReadingEntry,
} from "~/features/book-readings/presenters";
import { loadTermLabels } from "~/features/editorial/queries/taxonomy";
import { isUpcoming } from "~/lib/collections";

/** The reading circle as this page states it. */
export interface ReadingCircle {
  /** One entry per book, newest reading first, plus any article sittings. */
  entries: ReadingEntry[];
  /** The next sitting, or the last one held when nothing is scheduled. */
  opener?: NextSession;
}

export async function loadReadingCircle(): Promise<ReadingCircle> {
  const [readings, books, topicLabel] = await Promise.all([
    loadEditorialEntries("bookReadings"),
    loadReadingBooks(),
    loadTermLabels("topics"),
  ]);

  /*
   * The entries arrive newest first, so the soonest sitting still ahead of us
   * is the *last* of the upcoming ones, not the first. Taking the first would
   * open the page on whatever is furthest away, which is the one sitting a
   * reader is least likely to be deciding about.
   */
  const opening =
    readings.filter(isUpcoming).at(-1) ??
    readings.find((entry) => !isUpcoming(entry));

  /*
   * No totals are returned, deliberately. Not every session the circle has
   * held has been written up, so a count of books or of sittings taken from
   * this collection is a count of the record rather than of the reading, and
   * printing it as "10 books · 22 sessions · since 2020" states as fact
   * something nobody has checked.
   */
  return {
    entries: readingEntries(readings, books, topicLabel),
    opener: opening ? nextSession(opening, books.get(opening.id)) : undefined,
  };
}
