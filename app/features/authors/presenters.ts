/**
 * The strings an author's page prints.
 *
 * An author entry says almost nothing on its own — a name, and perhaps a
 * biography and a portrait. Everything else on the page is the relation
 * between that author and the reading circle, which is assembled here so the
 * component receives a view model rather than three collections to join.
 */
import { bookByline } from "~/features/books/presenters";
import { bookHref } from "~/features/books/queries/books";
import { sessionLabel } from "~/features/book-readings/titles";
import { entryHref } from "~/features/editorial/sections";
import { formatPacificShortDate } from "~/lib/dates";
import { isUpcoming } from "~/lib/collections";
import type { AuthorShelf } from "./queries/shelf";

/** One sitting on a book, as the run of sittings under it names it. */
export interface ShelfSession {
  href: string;
  /** "Chapters 1 – 4", or absent when only the date tells sittings apart. */
  label?: string;
  /** Dated with its year: an author's shelf routinely spans several. */
  dateLabel: string;
  dateTime: string;
}

/** One book of this author's, as their page lists it. */
export interface ShelfBook {
  key: string;
  href: string;
  title: string;
  subtitle?: string;
  /**
   * The other authors of an edited or co-written volume, never the author
   * whose page this is. Repeating their name under their own portrait says
   * nothing, and leaving the others out would misattribute the book.
   */
  coAuthors?: string;
  summary?: string;
  isbn: string;
  sessions: ShelfSession[];
  /** True while any of this book's sittings is still ahead of us. */
  upcoming: boolean;
}

/** An author's page, as the component prints it. */
export interface AuthorPage {
  /** The entry's id, which the archival portrait is also keyed by. */
  slug: string;
  name: string;
  /** Paragraphs, split on the blank lines the CMS text field carries. */
  bio: string[];
  portrait?: { src: string; alt: string };
  sourceUrl?: string;
  books: ShelfBook[];
  /** "3 books · 7 sessions", or the honest half of it when there are none. */
  shelfLine: string;
  /** What a search engine and a shared link are told the page is about. */
  description: string;
}

const count = (value: number, noun: string) =>
  `${value} ${value === 1 ? noun : `${noun}s`}`;

const paragraphs = (bio: string) => bio.split(/\n\s*\n/).filter(Boolean);

export function authorPage(shelf: AuthorShelf): AuthorPage {
  const { author, books } = shelf;
  const { name } = author.data;

  const sessions = books.reduce(
    (total, entry) => total + entry.readings.length,
    0,
  );

  const shelfBooks: ShelfBook[] = books.map((entry) => ({
    key: entry.book.id,
    href: bookHref(entry.book),
    title: entry.book.data.title,
    subtitle: entry.book.data.subtitle,
    coAuthors: bookByline({
      book: entry.book,
      authors: entry.authors.filter((other) => other.id !== author.id),
    }),
    summary: entry.book.data.summary,
    isbn: entry.book.data.isbn,
    upcoming: entry.readings.some(isUpcoming),
    sessions: entry.readings.map((reading) => ({
      href: entryHref("bookReadings", reading.id),
      label: sessionLabel(
        reading.data.title,
        entry.book.data.title,
        entry.book.data.subtitle,
      ),
      dateLabel: formatPacificShortDate(reading.data.date),
      dateTime: reading.data.date.toISOString(),
    })),
  }));

  return {
    slug: author.id,
    name,
    bio: author.data.bio ? paragraphs(author.data.bio) : [],
    portrait: author.data.portrait,
    sourceUrl: author.data.sourceUrl,
    books: shelfBooks,
    shelfLine:
      sessions === 0
        ? `${count(books.length, "book")} · not yet read`
        : `${count(books.length, "book")} · ${count(sessions, "session")}`,
    description:
      sessions === 0
        ? `${count(books.length, "book")} by ${name} on the Ambedkar King Study Circle's reading list, not yet read at a session.`
        : `${count(books.length, "book")} by ${name} on the Ambedkar King Study Circle's reading list, read across ${count(sessions, "session")}.`,
  };
}
