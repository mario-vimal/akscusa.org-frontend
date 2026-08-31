/**
 * Deciding what a book entry is missing and what may be written into it.
 *
 * Everything here is pure: it takes frontmatter an editor wrote and a record
 * fetched from a catalogue, and returns the fields to fill. The rule it exists
 * to hold is that a fetched value never replaces an editor's. A catalogue is a
 * fallback for a blank field, not an authority over the entry.
 */

import type { Scalar } from "./frontmatter.ts";

/** The subset of a catalogue record this site has a use for. */
export interface BookRecord {
  subtitle?: string;
  publisher?: string;
  /** Year of this edition, which for a reprint is not the year written. */
  publishedYear?: number;
  /** Year the text first appeared, kept for posthumous works. */
  firstPublishedYear?: number;
}

/**
 * The fields a catalogue may fill. `title`, `authors`, and `isbn` identify the
 * book and are the editor's to state; `topics`, `resources`, and `draft` are
 * editorial judgement. `summary` is deliberately absent: a catalogue summary is
 * the publisher's marketing copy, which is both the wrong voice for this site
 * and not ours to copy, so it stays a required field in the CMS.
 */
export const FILLABLE_FIELDS = [
  "subtitle",
  "publisher",
  "publishedYear",
  "firstPublishedYear",
] as const satisfies readonly (keyof BookRecord)[];

/**
 * Sveltia writes an empty string for a blank text widget and null for a blank
 * number widget, and a field an editor never opened is absent altogether. All
 * three mean the same thing here: nothing has been said, so we may say it.
 */
export function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

/**
 * A publication date in a catalogue is free text: "2014", "Nov 2014",
 * "2014-11-01", "1936, reprinted 2014". A year is taken only when the string
 * names exactly one, because guessing which of two years is meant is how a
 * reprint comes to claim it was written in the year it was reprinted.
 */
export function yearFromPublishDate(
  value: unknown,
  now = new Date(),
): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const years = [...value.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map(
    (match) => Number(match[1]),
  );
  const unique = [...new Set(years)];

  if (unique.length !== 1) {
    return undefined;
  }

  // A catalogue occasionally holds a typo far in the future. Next year is
  // allowed, because a book announced for it is real.
  return unique[0] <= now.getFullYear() + 1 ? unique[0] : undefined;
}

/**
 * The fields to write into this entry: those the record supplies and the entry
 * has left blank.
 *
 * A first publication cannot postdate the edition in hand, so a fetched
 * first-publication year later than the edition year is dropped rather than
 * written. That mismatch means the record describes a different edition, and a
 * wrong year is worse than a blank one.
 */
export function fieldsToFill(
  existing: Record<string, unknown>,
  record: BookRecord,
): Record<string, Scalar> {
  const fields: Record<string, Scalar> = {};

  for (const field of FILLABLE_FIELDS) {
    const value = record[field];

    if (value !== undefined && isBlank(existing[field])) {
      fields[field] = value;
    }
  }

  const editionYear = isBlank(existing.publishedYear)
    ? fields.publishedYear
    : existing.publishedYear;

  if (
    typeof fields.firstPublishedYear === "number" &&
    typeof editionYear === "number" &&
    fields.firstPublishedYear > editionYear
  ) {
    delete fields.firstPublishedYear;
  }

  return fields;
}
