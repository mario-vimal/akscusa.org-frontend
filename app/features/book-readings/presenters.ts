/**
 * Turns stored readings into the strings the book readings page prints.
 *
 * This lives with the book readings feature rather than in the shared
 * editorial presenters, because a reading resolves its book through the books
 * collection and the other editorial sections have no such relation.
 *
 * Book metadata is already resolved by stable entry ID. These functions only
 * present that data; they never load collections or look up editions by ISBN.
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
import type { AuthorLink } from "~/features/authors/links";
import type { Badge, Detail } from "~/features/editorial/presenters";
import { bookAuthorLinks, bookByline } from "~/features/books/presenters";
import { bookHref } from "~/features/books/links";
import type { BookWithAuthors } from "~/features/books/queries/books";
import { byNewestFirst, bySoonestFirst } from "~/lib/collection-policy";
import { isUpcomingReading } from "./calendar";
import { sessionLabel } from "./titles";

type Reading = EditorialEntry<"bookReadings">;

/**
 * Turns a stored topic id into the label the log prints. Topics are content an
 * editor maintains, so the lookup is loaded from the collection and passed in
 * rather than imported: these functions stay strings in, strings out.
 */
type TopicLabel = (id: string) => string;

const list = (values: readonly string[]) => values.join(", ");

/** The book a session worked through, named as a detail line prints it. */
const bookTitleAndAuthors = (entry: BookWithAuthors) => {
  const byline = bookByline(entry);

  return byline
    ? `${entry.book.data.title} by ${byline}`
    : entry.book.data.title;
};

export const bookReadingBadge = (reading: Reading): Badge =>
  isUpcomingReading(reading)
    ? { label: "Upcoming", tone: "accent" }
    : { label: "Past reading", tone: "muted" };

export interface Participation {
  label: string;
  href: string;
}

const readingParticipation = (reading: Reading): Participation | undefined =>
  reading.data.registrationUrl
    ? {
        // A shortened participation URL can open Zoom or a registration form.
        label: isUpcomingReading(reading)
          ? "Join or register"
          : "Session participation link",
        href: reading.data.registrationUrl,
      }
    : undefined;

export function bookReadingDetails(
  reading: Reading,
  entry?: BookWithAuthors,
): Detail[] {
  const details: Detail[] = [
    { term: "When", description: formatPacificTime(reading.data.date) },
    { term: "Where", description: reading.data.location },
  ];

  const participation = readingParticipation(reading);
  if (participation) {
    details.push({
      term: "Participation",
      description: participation.label,
      href: participation.href,
    });
  }

  if (entry) {
    details.push({
      term: "Book",
      description: bookTitleAndAuthors(entry),
      href: bookHref(entry.book),
    });
    if (entry.book.data.isbn) {
      details.push({ term: "ISBN", description: entry.book.data.isbn });
    }
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
interface ReadingEntryContent {
  /** The published book's ID, or the standalone session's ID. */
  key: string;
  /** The published book's page, or the session's own public record. */
  href: string;
  title: string;
  subtitle?: string;
  /** The authors on one line, which is what the entry prints. */
  byline?: string;
  /**
   * The same authors one at a time, for the byline's links and for the author
   * dropdown, which files an entry under each author's slug. Splitting the
   * printed line back apart would depend on how it was joined, and would file
   * one person under two names the moment a catalogue spells them differently.
   */
  authors: AuthorLink[];
  /** The uploaded cover, absent for an entry with no book or no cover. */
  cover?: string;
  summary?: string;
  sessionCount: number;
  /** "June – October 2025", or one month when the run stayed inside it. */
  spanLabel: string;
  /** Every Pacific year represented by its sessions, for the year dropdown. */
  years: number[];
  /** Most recent sitting, which is the date the entry is ordered by. */
  dateTime: string;
  /** True while any of the entry's sittings is still ahead of us. */
  upcoming: boolean;
  /** The sittings newest first, matching the log's dated order. */
  sessions: SessionLink[];
  posters: EntryPoster[];
  topics: string[];
  /** Everything the search box matches against, lowercased once up front. */
  search: string;
}

/**
 * A withheld book cannot be offered as a book facet or called an article.
 * Keeping these states distinct also prevents its private metadata leaking
 * into the search text, cover, or byline.
 */
export type ReadingEntry = ReadingEntryContent &
  (
    | { bookState: "published"; readsArticles: false }
    | { bookState: "unpublished"; readsArticles: false }
    | { bookState: "none"; readsArticles: true }
  );

const sessionHref = (reading: Reading) => entryHref("bookReadings", reading.id);

/** Oldest first, for working out the run a book was read over. */
const chronological = (sessions: readonly Reading[]): Reading[] =>
  [...sessions].sort(bySoonestFirst);

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
    upcoming: isUpcomingReading(reading),
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

/** Every Pacific session year, newest first, for the year dropdown. */
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
  entry: BookWithAuthors | undefined,
  topics: readonly string[],
): string {
  return (
    [
      entry?.book.data.title,
      entry?.book.data.subtitle,
      entry ? bookByline(entry) : undefined,
      entry?.book.data.isbn,
      entry?.book.data.summary,
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

function bookEntry(
  entry: BookWithAuthors,
  unordered: readonly Reading[],
  topicLabel: TopicLabel,
): ReadingEntry {
  const { book } = entry;
  const run = chronological(unordered);
  const first = run[0];
  const last = run[run.length - 1];

  /*
   * The sittings are printed newest first, like the log they sit in and like
   * every other dated list on the site. The run itself is still worked out in
   * order, because a span reads from its start to its end whichever way round
   * the sittings under it are shown.
   */
  const sessions = [...run].sort(byNewestFirst);

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
    byline: bookByline(entry),
    authors: bookAuthorLinks(entry),
    cover: book.data.cover,
    summary: book.data.summary,
    sessionCount: run.length,
    spanLabel: formatPacificMonthRange(first.data.date, last.data.date),
    years: readingYears(run),
    dateTime: last.data.date.toISOString(),
    upcoming: run.some(isUpcomingReading),
    bookState: "published",
    readsArticles: false,
    sessions: sessionLinks(sessions, book.data, spansYears),
    posters: entryPosters(sessions),
    topics,
    search: entrySearch(run, entry, topics),
  };
}

/** Without a published book, the session's own public record stands alone. */
function standaloneEntry(
  reading: Reading,
  topicLabel: TopicLabel,
): ReadingEntry {
  const topics = reading.data.topics.map(topicLabel);
  const sessions = [reading];
  const material = reading.data.book
    ? ({ bookState: "unpublished", readsArticles: false } as const)
    : ({ bookState: "none", readsArticles: true } as const);

  return {
    ...material,
    key: reading.id,
    href: sessionHref(reading),
    title: reading.data.title,
    // There is no published book byline to file this session under.
    authors: [],
    summary: reading.data.summary,
    sessionCount: 1,
    spanLabel: formatPacificMonthRange(reading.data.date, reading.data.date),
    years: readingYears(sessions),
    dateTime: reading.data.date.toISOString(),
    upcoming: isUpcomingReading(reading),
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
 * that has no published book to link to.
 *
 * The readings arrive newest first and an entry is emitted where its most
 * recent sitting sits, so a book the circle returns to moves back to the top
 * rather than staying filed under the year it was first opened.
 */
export function readingEntries(
  readings: readonly Reading[],
  books: ReadonlyMap<string, BookWithAuthors>,
  topicLabel: TopicLabel,
): ReadingEntry[] {
  const ordered = [...readings].sort(byNewestFirst);
  const sessionsByBook = new Map<string, Reading[]>();

  for (const reading of ordered) {
    const entry = books.get(reading.id);
    if (!entry) continue;

    const sessions = sessionsByBook.get(entry.book.id) ?? [];
    sessions.push(reading);
    sessionsByBook.set(entry.book.id, sessions);
  }

  const emitted = new Set<string>();
  const entries: ReadingEntry[] = [];

  for (const reading of ordered) {
    const entry = books.get(reading.id);

    if (!entry) {
      entries.push(standaloneEntry(reading, topicLabel));
      continue;
    }

    const { id } = entry.book;
    if (emitted.has(id)) continue;
    emitted.add(id);
    entries.push(
      bookEntry(entry, sessionsByBook.get(id) ?? [reading], topicLabel),
    );
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
  participation?: Participation;
  book?: {
    title: string;
    /** The authors on one line, absent when the entry names none. */
    byline?: string;
    href: string;
    cover?: string;
  };
}

export function nextSession(
  reading: Reading,
  entry?: BookWithAuthors,
): NextSession {
  return {
    href: sessionHref(reading),
    title: reading.data.title,
    summary: reading.data.summary,
    dateTime: reading.data.date.toISOString(),
    whenLabel: formatPacificTime(reading.data.date),
    location: reading.data.location,
    upcoming: isUpcomingReading(reading),
    participation: readingParticipation(reading),
    book: entry
      ? {
          title: entry.book.data.title,
          byline: bookByline(entry),
          href: bookHref(entry.book),
          cover: entry.book.data.cover,
        }
      : undefined,
  };
}
