/**
 * Turns stored readings into the strings the book readings page prints.
 *
 * This lives with the book readings feature rather than in the shared
 * editorial presenters, because a reading resolves its book through the books
 * collection and the other editorial sections have no such relation.
 *
 * Nothing here returns an image. An entry carries the ISBN of the edition read
 * and the component looks the cover up, so these functions stay strings in and
 * strings out.
 */
import { entryHref, type EditorialEntry } from "~/features/editorial/sections";
import {
  formatPacificDate,
  formatPacificMonthDay,
  formatPacificMonthRange,
  formatPacificShortDate,
  formatPacificTime,
  pacificYear,
} from "~/lib/dates";
import type { Badge, Detail } from "~/features/editorial/presenters";
import { topicLabel } from "~/features/editorial/taxonomy";
import { bookAuthors } from "~/features/books/presenters";
import { bookHref, type Book } from "~/features/books/queries/books";
import { isUpcoming } from "~/lib/collections";
import { sessionLabel } from "~/features/book-readings/titles";

type Reading = EditorialEntry<"bookReadings">;

const list = (values: readonly string[]) => values.join(", ");

/** The book a session worked through, named as a detail line prints it. */
const bookTitleAndAuthors = (book: Book) => {
  const authors = bookAuthors(book);

  return authors ? `${book.data.title} by ${authors}` : book.data.title;
};

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
      description: bookTitleAndAuthors(book),
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

  return details;
}

/* -------------------------------------------------------------------------
 * The reading log
 * ---------------------------------------------------------------------- */

/**
 * A flyer as the log draws it. The caption falls back to the session's own
 * title, because a flyer opened from an entry that covers four evenings has to
 * say which of them it announced; on the session's own page the surrounding
 * page already answers that and the field is usually left empty.
 */
export interface EntryPoster {
  src: string;
  alt: string;
  caption: string;
}

/** One sitting, as the run of sittings under a book's entry names it. */
export interface SessionLink {
  href: string;
  /** "Chapters 1 – 4", or absent when only the date tells sittings apart. */
  label?: string;
  /** "Jun 28" — the entry's own line already states the year. */
  dateLabel: string;
  dateTime: string;
  upcoming: boolean;
}

/**
 * One book the circle has read, with every sitting it took.
 *
 * A book worked through over four evenings is one entry, not four. A visitor
 * scanning the page wants to know what has been read; that the circle needed
 * four Sundays to get through it is a fact about the entry, not four separate
 * things to read past. The sittings are still there, listed inside the entry
 * with their chapter ranges, so nothing is lost — and the flyers each evening
 * was announced with are stacked beside them, because that artwork is the one
 * part of the record that is worth looking at rather than reading.
 */
export interface ReadingEntry {
  /** Stable key: the book's id, or the session's when there is no book. */
  key: string;
  /** The book's page, or the session's own page when it read no book. */
  href: string;
  title: string;
  subtitle?: string;
  authors?: string;
  /**
   * The authors one at a time, for the author dropdown. The joined `authors`
   * line is what the entry prints; a filter has to match a single name, and
   * splitting the printed line back apart would depend on how it was joined.
   */
  authorNames: string[];
  /** Absent for an entry with no book; the component resolves the cover. */
  isbn?: string;
  summary?: string;
  sessionCount: number;
  /** "June – October 2025", or one month when the run stayed inside it. */
  spanLabel: string;
  /** Every year the entry was read in, for the year dropdown. */
  years: number[];
  /** Most recent sitting, which is the date the entry is ordered by. */
  dateTime: string;
  /** True while any of the entry's sittings is still ahead of us. */
  upcoming: boolean;
  /**
   * True when the entry read articles or papers rather than a book. Distinct
   * from an entry whose book is simply not published yet, which shows nothing
   * rather than claiming it read articles.
   */
  readsArticles: boolean;
  /** The sittings in reading order, so chapter ranges count upwards. */
  sessions: SessionLink[];
  posters: EntryPoster[];
  topics: string[];
  /** Everything the search box matches against, lowercased once up front. */
  search: string;
}

const sessionHref = (reading: Reading) => entryHref("bookReadings", reading.id);

/** Oldest first, for working out the run a book was read over. */
const chronological = (sessions: readonly Reading[]): Reading[] =>
  [...sessions].sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

const sessionLinks = (
  sessions: readonly Reading[],
  book: { title: string; subtitle?: string } | undefined,
  /** Set when the entry's run crosses a year, which the date must then name. */
  withYear: boolean,
): SessionLink[] =>
  sessions.map((reading) => ({
    href: sessionHref(reading),
    label: sessionLabel(reading.data.title, book?.title, book?.subtitle),
    dateLabel: withYear
      ? formatPacificShortDate(reading.data.date)
      : formatPacificMonthDay(reading.data.date),
    dateTime: reading.data.date.toISOString(),
    upcoming: isUpcoming(reading),
  }));

const entryPosters = (sessions: readonly Reading[]): EntryPoster[] =>
  sessions.flatMap((reading) =>
    reading.data.posters.map((poster) => ({
      src: poster.src,
      alt: poster.alt,
      caption: poster.caption ?? reading.data.title,
    })),
  );

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** Every year an entry was read in, newest first, for the year dropdown. */
const readingYears = (sessions: readonly Reading[]): number[] =>
  unique(sessions.map((reading) => pacificYear(reading.data.date))).sort(
    (a, b) => b - a,
  );

/**
 * Everything the log's search box matches an entry against.
 *
 * Every sitting's own title and summary are folded in, so a reader looking for
 * a chapter range still finds the book, even though the entry only prints the
 * book's title at the top. The date of each sitting carries its year, which is
 * what makes "2025" a usable query.
 */
function entrySearch(
  sessions: readonly Reading[],
  book: Book | undefined,
  topics: readonly string[],
): string {
  return (
    [
      book?.data.title,
      book?.data.subtitle,
      book ? bookAuthors(book) : undefined,
      book?.data.isbn,
      book?.data.summary,
      ...sessions.map((reading) => reading.data.title),
      ...sessions.map((reading) => reading.data.summary),
      ...sessions.map((reading) => formatPacificDate(reading.data.date)),
      ...topics,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      // A summary set as verse arrives with its own line breaks, and a query is
      // typed on one line; matching is a plain substring test, so the haystack
      // has to be one line too.
      .replace(/\s+/g, " ")
  );
}

function bookEntry(book: Book, unordered: readonly Reading[]): ReadingEntry {
  const run = chronological(unordered);
  const first = run[0];
  const last = run[run.length - 1];

  /*
   * The sittings are printed newest first, like the log they sit in and like
   * every other dated list on the site. The run itself is still worked out in
   * order, because a span reads from its start to its end whichever way round
   * the sittings under it are shown.
   */
  const sessions = [...run].reverse();

  const topics = unique([
    ...book.data.topics,
    ...run.flatMap((reading) => reading.data.topics),
  ]).map(topicLabel);

  // A book the circle came back to years later cannot let its sittings print a
  // bare "Apr 5"; under one entry covering 2020 and 2025 that names neither.
  const spansYears =
    pacificYear(first.data.date) !== pacificYear(last.data.date);

  return {
    key: book.id,
    href: bookHref(book),
    title: book.data.title,
    subtitle: book.data.subtitle,
    authors: bookAuthors(book),
    authorNames: [...book.data.authors],
    isbn: book.data.isbn,
    summary: book.data.summary,
    sessionCount: run.length,
    spanLabel: formatPacificMonthRange(first.data.date, last.data.date),
    years: readingYears(run),
    dateTime: last.data.date.toISOString(),
    upcoming: run.some(isUpcoming),
    readsArticles: false,
    sessions: sessionLinks(sessions, book.data, spansYears),
    posters: entryPosters(sessions),
    topics,
    search: entrySearch(run, book, topics),
  };
}

/** A sitting that worked through no book, which stands as its own entry. */
function articlesEntry(reading: Reading): ReadingEntry {
  const topics = reading.data.topics.map(topicLabel);
  const sessions = [reading];

  return {
    key: reading.id,
    href: sessionHref(reading),
    title: reading.data.title,
    // A reading list of articles has no one author to file it under.
    authorNames: [],
    summary: reading.data.summary,
    sessionCount: 1,
    spanLabel: formatPacificMonthRange(reading.data.date, reading.data.date),
    years: readingYears(sessions),
    dateTime: reading.data.date.toISOString(),
    upcoming: isUpcoming(reading),
    readsArticles: true,
    // Its own title is the entry's heading, so stripping it leaves the sitting
    // with just its date — which is all that is left to say about it.
    sessions: sessionLinks(sessions, { title: reading.data.title }, false),
    posters: entryPosters(sessions),
    topics,
    search: entrySearch(sessions, undefined, topics),
  };
}

/**
 * The log, newest first: one entry per book, plus an entry for each sitting
 * that read no book.
 *
 * The readings arrive newest first and an entry is emitted where its most
 * recent sitting sits, so a book the circle returns to moves back to the top
 * rather than staying filed under the year it was first opened.
 */
export function readingEntries(
  readings: readonly Reading[],
  books: ReadonlyMap<string, Book>,
): ReadingEntry[] {
  const sessionsByBook = new Map<string, Reading[]>();

  for (const reading of readings) {
    const book = books.get(reading.id);
    if (!book) continue;

    const sessions = sessionsByBook.get(book.id) ?? [];
    sessions.push(reading);
    sessionsByBook.set(book.id, sessions);
  }

  const emitted = new Set<string>();
  const entries: ReadingEntry[] = [];

  for (const reading of readings) {
    const book = books.get(reading.id);

    if (!book) {
      entries.push(articlesEntry(reading));
      continue;
    }

    if (emitted.has(book.id)) continue;
    emitted.add(book.id);
    entries.push(bookEntry(book, sessionsByBook.get(book.id) ?? [reading]));
  }

  return entries;
}

/* -------------------------------------------------------------------------
 * The session the page opens on
 * ---------------------------------------------------------------------- */

/**
 * The next sitting if there is one, otherwise the last one held.
 *
 * A reading circle's index is read by someone deciding whether to come, so the
 * first thing on it should be the thing they can come to. When nothing is
 * scheduled the same panel says when the circle last met, which is an honest
 * answer rather than an empty space.
 */
export interface NextSession {
  href: string;
  title: string;
  summary: string;
  dateTime: string;
  /** "March 15, 2025 at 3:00 PM PDT" — the whole appointment, in one line. */
  whenLabel: string;
  location: string;
  upcoming: boolean;
  book?: {
    title: string;
    authors?: string;
    href: string;
    isbn: string;
  };
}

export function nextSession(reading: Reading, book?: Book): NextSession {
  return {
    href: sessionHref(reading),
    title: reading.data.title,
    summary: reading.data.summary,
    dateTime: reading.data.date.toISOString(),
    whenLabel: formatPacificTime(reading.data.date),
    location: reading.data.location,
    upcoming: isUpcoming(reading),
    book: book
      ? {
          title: book.data.title,
          authors: bookAuthors(book),
          href: bookHref(book),
          isbn: book.data.isbn,
        }
      : undefined,
  };
}
