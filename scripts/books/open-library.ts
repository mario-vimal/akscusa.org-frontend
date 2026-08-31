/**
 * Open Library, the one catalogue this site asks about a book.
 *
 * It is queried by the ISBN of the edition read, which is the same key that
 * links a reading to its book, so nothing has to be wired up by hand. Every
 * lookup falls back to the ISBN-10 of the same edition, because records
 * catalogued before 2007 are often held only under the older number.
 *
 * Nothing here runs at build time. The site is built from what this has already
 * written into the repository, so a page never depends on Open Library being up.
 */

import {
  isbn10FromIsbn13,
  normalizeIsbn,
} from "../../app/features/books/isbn.ts";
import { type BookRecord, yearFromPublishDate } from "./fields.ts";

/** Open Library serves a placeholder unless `default=false` asks it not to. */
export const coverUrl = (isbn: string) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

const editionUrl = (isbn: string) =>
  `https://openlibrary.org/isbn/${isbn}.json`;

/** The keys to try for one edition: the ISBN-13 first, then its ISBN-10. */
export function lookupKeys(isbn: string): string[] {
  const isbn13 = normalizeIsbn(isbn);
  const isbn10 = isbn10FromIsbn13(isbn13);

  return isbn10 ? [isbn13, isbn10] : [isbn13];
}

/** Just enough of Open Library's shape to read the fields we fill. */
interface Edition {
  subtitle?: unknown;
  publishers?: unknown;
  publish_date?: unknown;
  works?: unknown;
}

interface Work {
  first_publish_date?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstString = (value: unknown): string | undefined =>
  Array.isArray(value) && typeof value[0] === "string" && value[0].trim() !== ""
    ? value[0].trim()
    : undefined;

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/** The work an edition belongs to, which is where a first publication is held. */
function workKey(edition: Edition): string | undefined {
  const works = edition.works;

  if (!Array.isArray(works) || !isRecord(works[0])) {
    return undefined;
  }

  const key = works[0].key;

  return typeof key === "string" && key.startsWith("/works/") ? key : undefined;
}

async function get(
  url: string,
  accept?: string,
): Promise<Response | undefined> {
  try {
    const response = await fetch(url, accept ? { headers: { accept } } : {});

    return response.ok ? response : undefined;
  } catch (error) {
    // Open Library being unreachable is reported and stepped over rather than
    // thrown: a run that fills nine books out of ten is worth keeping, and the
    // tenth is picked up the next time this runs.
    console.warn(`Could not reach ${url}: ${String(error)}`);

    return undefined;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await get(url, "application/json");

  return response ? response.json() : undefined;
}

/** The cover image bytes, or nothing when Open Library holds no cover. */
export async function fetchCover(isbn: string): Promise<Buffer | undefined> {
  for (const key of lookupKeys(isbn)) {
    const response = await get(coverUrl(key));

    if (response) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  return undefined;
}

/** What Open Library knows about this edition, as fields this site can fill. */
export async function fetchRecord(isbn: string): Promise<BookRecord> {
  let edition: Edition | undefined;

  for (const key of lookupKeys(isbn)) {
    const json = await fetchJson(editionUrl(key));

    if (isRecord(json)) {
      edition = json;
      break;
    }
  }

  if (!edition) {
    return {};
  }

  const key = workKey(edition);
  const work: Work | undefined = key
    ? await fetchJson(`https://openlibrary.org${key}.json`).then((json) =>
        isRecord(json) ? json : undefined,
      )
    : undefined;

  return {
    subtitle: text(edition.subtitle),
    publisher: firstString(edition.publishers),
    publishedYear: yearFromPublishDate(edition.publish_date),
    firstPublishedYear: yearFromPublishDate(work?.first_publish_date),
  };
}
