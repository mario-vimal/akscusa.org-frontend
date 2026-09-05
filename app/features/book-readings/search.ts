/**
 * Searching the reading log.
 *
 * The log is a record, so it has exactly one order: the order the circle met
 * in. What a reader needs on top of that is a way to find a session, which is
 * this. The logic is kept out of the component so it can be tested directly;
 * the component only reads the strings off its rows and hides the ones that do
 * not match.
 */

import type { ReadingEntry } from "./presenters";
import { byId } from "~/lib/collection-policy";

/**
 * Splits a query into the terms a row must all match. Each term becomes a list
 * of alternatives, so an ISBN copied off the back of a book with its hyphens
 * still matches the bare digits stored on the row, while a genuinely hyphenated
 * word such as "anti-caste" keeps matching as typed.
 */
export const searchTerms = (query: string): string[][] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => {
      const compact = term.replace(/[-\u2010-\u2015\s]/g, "");
      return compact && compact !== term ? [term, compact] : [term];
    });

export const matchesSearch = (
  haystack: string,
  terms: readonly (readonly string[])[],
): boolean =>
  terms.every((alternatives) =>
    alternatives.some((alternative) => haystack.includes(alternative)),
  );

/**
 * What the status line says.
 *
 * It never states a total. The readings on this page are the ones that have
 * been written up, not a census of everything the circle has met about, so a
 * line reading "all 11 readings" would claim a completeness the record does
 * not have. A match count is a fact about the filter the reader just typed,
 * which is a different kind of statement, and the unfiltered line says what
 * the list is ordered by instead — which is the thing a reader actually needs
 * to know before scanning it.
 */
export function logStatusLabel(visible: number, total: number): string {
  if (visible === total) {
    return "Newest first.";
  }

  if (visible === 0) {
    return "No readings match those filters.";
  }

  return visible === 1 ? "1 reading matches." : `${visible} readings match.`;
}

/* -------------------------------------------------------------------------
 * The dropdown filters
 * ---------------------------------------------------------------------- */

/**
 * The parts of a log entry the filters read.
 *
 * The browser needs identity and classification, not the rest of the
 * presentation. The type-only import adds no presenter code to its bundle.
 */
export interface FilterableEntry {
  key: string;
  title: string;
  bookState: ReadingEntry["bookState"];
  authors: readonly { slug: string; name: string }[];
  years: readonly number[];
}

export interface FacetOption {
  value: string;
  label: string;
}

/** The options each dropdown offers, taken from the entries on the page. */
export interface LogFacets {
  books: FacetOption[];
  authors: FacetOption[];
  years: FacetOption[];
}

const byLabel = new Intl.Collator("en", { sensitivity: "base" });

/**
 * The filters are built from what is on the page rather than from the whole
 * vocabulary, so a dropdown can never offer a choice that matches nothing.
 *
 * Books are listed by title and authors alphabetically, because that is how a
 * reader looking for one scans a list. Years run newest first, matching the
 * order of the log itself. An entry that read articles rather than a book is
 * left out of the book list, as is a session whose book is unpublished. Both
 * remain reachable by year or by the search box.
 *
 * An author is keyed by their slug rather than by the name printed beside it.
 * Filtering on the name was the thing that broke the first time a catalogue
 * returned "Kancha Ilaiah" for one book and "Kancha Ilaiah Shepherd" for
 * another: one person became two entries in the dropdown, each hiding half of
 * their own books.
 */
export function logFacets(entries: readonly FilterableEntry[]): LogFacets {
  const publishedBooks = entries.filter(
    (entry) => entry.bookState === "published",
  );
  const books = publishedBooks
    .map((entry) => ({ value: entry.key, label: entry.title }))
    .sort(
      (a, b) =>
        byLabel.compare(a.label, b.label) ||
        byId({ id: a.value }, { id: b.value }),
    );

  const names = new Map<string, string>();
  for (const entry of publishedBooks) {
    for (const author of entry.authors) {
      // First name seen wins, which is the one nearest the top of the log.
      // Every entry resolves its authors through the authors collection, so
      // one slug carries one name; this only keeps the result stable if that
      // ever stops being true.
      if (!names.has(author.slug)) names.set(author.slug, author.name);
    }
  }

  const authors = [...names]
    .map(([value, label]) => ({ value, label }))
    .sort(
      (a, b) =>
        byLabel.compare(a.label, b.label) ||
        byId({ id: a.value }, { id: b.value }),
    );

  const years = [...new Set(entries.flatMap((entry) => entry.years))]
    .sort((a, b) => b - a)
    .map((year) => ({ value: String(year), label: String(year) }));

  return { books, authors, years };
}

/*
 * A row belongs to several authors and several years at once, so a facet is
 * written into one attribute as a delimited set rather than as one attribute
 * per value. A book is a single value, but it is written the same way so every
 * dropdown can be tested by the same rule. The delimiters are kept on both
 * ends, so a test for "|2020|" cannot match "|12020|", and a delimiter inside
 * a value is dropped rather than escaped — a pipe in an author's name would
 * otherwise split it in two.
 */
const DELIMITER = "|";

export const facetSet = (values: readonly (string | number)[]): string =>
  values.length === 0
    ? ""
    : DELIMITER +
      values
        .map((value) => String(value).split(DELIMITER).join(""))
        .join(DELIMITER) +
      DELIMITER;

/** Whether a row is in the chosen facet. An empty choice matches everything. */
export const inFacetSet = (selected: string, set: string): boolean =>
  selected === "" || set.includes(DELIMITER + selected + DELIMITER);
