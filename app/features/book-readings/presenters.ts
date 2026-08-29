/**
 * Turns a stored reading into the strings its table row and detail page print.
 * This lives with the book readings feature rather than in the shared
 * editorial presenters, because a reading resolves its book through the books
 * collection and the other editorial sections have no such relation.
 */
import { entryHref, type EditorialEntry } from "~/features/editorial/sections";
import { formatPacificDate, formatPacificTime } from "~/lib/dates";
import type { Badge, Detail } from "~/features/editorial/presenters";
import { topicLabel } from "~/features/editorial/taxonomy";
import { bookHref, type Book } from "~/features/books/queries/books";

type Reading = EditorialEntry<"bookReadings">;

const list = (values: readonly string[]) => values.join(", ");

const isUpcoming = (reading: Reading) =>
  reading.data.date.getTime() >= Date.now();

export const bookReadingBadge = (reading: Reading): Badge =>
  isUpcoming(reading)
    ? { label: "Upcoming", tone: "accent" }
    : { label: "Past reading", tone: "muted" };

export function bookReadingDetails(reading: Reading, book?: Book): Detail[] {
  const details: Detail[] = [
    { term: "When", description: formatPacificTime(reading.data.date) },
    { term: "Where", description: reading.data.location },
  ];

  if (book) {
    details.push({
      term: "Book",
      description: `${book.data.title} by ${list(book.data.authors)}`,
      href: bookHref(book),
    });
    details.push({ term: "ISBN", description: book.data.isbn });
  }

  if (reading.data.participants.length > 0) {
    details.push({
      term:
        reading.data.participants.length === 1 ? "Participant" : "Participants",
      description: list(reading.data.participants),
    });
  }

  // Registration is only useful while a session is still ahead of us.
  if (reading.data.registrationUrl && isUpcoming(reading)) {
    details.push({
      term: "Registration",
      description: "Register to join this reading",
      href: reading.data.registrationUrl,
    });
  }

  return details;
}

/** One row of the readings table, with the keys it sorts and filters on. */
export interface BookReadingRow {
  href: string;
  title: string;
  /** Machine-readable start time for the `<time>` element. */
  dateTime: string;
  dateLabel: string;
  /** ISO strings sort chronologically as a plain string comparison. */
  dateKey: string;
  book?: {
    title: string;
    authors: string;
    href: string;
  };
  /**
   * True when the session was built on articles or papers rather than a book.
   * Distinct from a session whose book is simply not published yet, which shows
   * nothing rather than claiming it read articles.
   */
  readsArticles: boolean;
  /** Empty for a session with no resolved book, which always sorts last. */
  bookKey: string;
  titleKey: string;
  location: string;
  upcoming: boolean;
  /** Everything the search box matches against, lowercased once up front. */
  search: string;
}

export function bookReadingRows(
  readings: readonly Reading[],
  books: ReadonlyMap<string, Book>,
): BookReadingRow[] {
  return readings.map((reading) => {
    const { title, summary, date, location, topics, isbn } = reading.data;
    const dateLabel = formatPacificDate(date);
    const book = books.get(reading.id);
    const authors = book ? list(book.data.authors) : undefined;

    // Searching covers what the row shows plus what it only implies, so a
    // reader can narrow by year, topic, author, or ISBN without every one of
    // those needing its own column.
    const search = [
      title,
      summary,
      dateLabel,
      book?.data.title,
      book?.data.subtitle,
      authors,
      book?.data.isbn,
      location,
      ...topics.map(topicLabel),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      href: entryHref("bookReadings", reading.id),
      title,
      dateTime: date.toISOString(),
      dateLabel,
      dateKey: date.toISOString(),
      book:
        book && authors
          ? { title: book.data.title, authors, href: bookHref(book) }
          : undefined,
      readsArticles: !isbn,
      bookKey: book?.data.title.toLowerCase() ?? "",
      titleKey: title.toLowerCase(),
      location,
      upcoming: isUpcoming(reading),
      search,
    };
  });
}
