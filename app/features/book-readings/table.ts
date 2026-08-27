/**
 * Sorting and filtering for the readings table. The logic is kept out of the
 * component so it can be tested directly: the component only maps table rows
 * onto these shapes and reorders the DOM with the result.
 */

export type SortKey = "date" | "title" | "book";

export interface SortState {
  key: SortKey;
  ascending: boolean;
}

/** A row reduced to the values it sorts and filters on. */
export interface SortableRow {
  /** ISO timestamp, which sorts chronologically as a plain string. */
  date: string;
  title: string;
  /** Empty for a reading with no single book. */
  book: string;
  /** Pre-lowercased text the search box matches against. */
  search: string;
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

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

export function compareRows(
  a: SortableRow,
  b: SortableRow,
  { key, ascending }: SortState,
): number {
  const left = a[key];
  const right = b[key];

  // A reading with no single book has nothing to sort by, so it collects at
  // the bottom whichever way the column is pointing.
  if (left === "" || right === "") {
    if (left === right) return 0;
    return left === "" ? 1 : -1;
  }

  const order = collator.compare(left, right);
  return ascending ? order : -order;
}

export function sortRows<T extends SortableRow>(
  rows: readonly T[],
  state: SortState,
): T[] {
  return [...rows].sort((a, b) => compareRows(a, b, state));
}

/**
 * How the next click on a column should sort. Dates are most useful newest
 * first, text columns A to Z, and clicking the active column reverses it.
 */
export function nextSortState(current: SortState, key: SortKey): SortState {
  if (current.key === key) {
    return { key, ascending: !current.ascending };
  }
  return { key, ascending: key !== "date" };
}

export function resultLabel(visible: number, total: number): string {
  const noun = total === 1 ? "reading" : "readings";
  if (visible === total) {
    return `Showing all ${total} ${noun}.`;
  }
  return `Showing ${visible} of ${total} ${noun}.`;
}
