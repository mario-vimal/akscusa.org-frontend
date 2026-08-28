import type { ImageMetadata } from "astro";

import { bookHref, loadReadingBooks } from "../books/queries/books";
import { coverForIsbn } from "../books/covers";
import {
  editorialSections,
  entryHref,
  loadEditorialEntries,
  type EditorialCollection,
  type EditorialEntry,
} from "../editorial/entries";

/**
 * What the homepage puts in front of a first-time reader.
 *
 * Everything here is derived from collections that already exist, at build
 * time. There is no homepage collection and no new CMS field: a page that only
 * ever shows the newest entry of each kind has nothing for an editor to fill
 * in, and modelling it as content would mean maintaining the same facts twice.
 *
 * The one editorial control is `featured`, which is already in the shared
 * editorial schema and already editable in Sveltia. It was previously read
 * nowhere; the spotlight is the thing it was for.
 */

/** Midnight today, so an event happening today still counts as upcoming. */
const startOfToday = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

const isUpcoming = (entry: { data: { date: Date } }) =>
  entry.data.date.getTime() >= startOfToday().getTime();

const bySoonestFirst = (
  a: { data: { date: Date } },
  b: { data: { date: Date } },
) => a.data.date.getTime() - b.data.date.getTime();

export interface FeaturedRef {
  collection: EditorialCollection;
  id: string;
  href: string;
  /** The section the entry belongs to, for example "Conferences". */
  section: string;
  title: string;
  summary: string;
  date: Date;
  upcoming: boolean;
}

const toRef = <C extends EditorialCollection>(
  collection: C,
  entry: EditorialEntry<C>,
): FeaturedRef => ({
  collection,
  id: entry.id,
  href: entryHref(collection, entry.id),
  section: editorialSections[collection].label,
  title: entry.data.title,
  summary: entry.data.summary,
  date: entry.data.date,
  upcoming: isUpcoming(entry),
});

export interface Spotlight extends FeaturedRef {
  /** A conference theme, when the spotlight is a conference that names one. */
  theme?: string;
  location?: string;
  registrationUrl?: string;
}

/**
 * The one thing worth interrupting a reader for: what AKSC is doing next.
 *
 * An entry an editor marked `featured` wins. Otherwise the soonest upcoming
 * gathering wins, and if nothing is scheduled the most recent one stands in, so
 * the band never empties out between conferences.
 */
export async function loadSpotlight(): Promise<Spotlight | undefined> {
  const conferences = await loadEditorialEntries("conferences");
  const programs = await loadEditorialEntries("programs");

  const flagged =
    conferences.find((entry) => entry.data.featured && isUpcoming(entry)) ??
    programs.find((entry) => entry.data.featured && isUpcoming(entry)) ??
    conferences.find((entry) => entry.data.featured) ??
    programs.find((entry) => entry.data.featured);

  if (flagged) return decorate(flagged, conferences);

  const upcoming = [...conferences, ...programs]
    .filter(isUpcoming)
    .sort(bySoonestFirst)[0];

  const chosen = upcoming ?? conferences[0] ?? programs[0];
  return chosen ? decorate(chosen, conferences) : undefined;
}

function decorate(
  entry: EditorialEntry<"conferences"> | EditorialEntry<"programs">,
  conferences: EditorialEntry<"conferences">[],
): Spotlight {
  const isConference = conferences.some(
    (candidate) => candidate.id === entry.id,
  );
  const base = isConference
    ? toRef("conferences", entry as EditorialEntry<"conferences">)
    : toRef("programs", entry as EditorialEntry<"programs">);

  const data = entry.data as EditorialEntry<"conferences">["data"] &
    EditorialEntry<"programs">["data"];

  return {
    ...base,
    theme: "theme" in data ? data.theme : undefined,
    location: data.location,
    registrationUrl: data.registrationUrl,
  };
}

export interface BookFeature {
  title: string;
  authors: string;
  href: string;
  cover?: ImageMetadata;
  /** The day the circle last sat with this book. */
  readOn: Date;
  /** How many sessions the circle has held on it. */
  sessions: number;
}

export interface ReadingFeature extends FeaturedRef {
  location: string;
}

/**
 * The reading circle, in the two parts a reader actually asks about: the
 * session — the one coming up, or the last one held — and the book itself.
 *
 * They are loaded separately because they are not always the same entry. A
 * session can be a set of articles rather than a book, in which case the
 * newest session has no cover to show and the newest *book* is a different
 * record. Keeping them apart means the band can show a cover without
 * pretending the circle read a book it did not.
 */
export async function loadReading(): Promise<ReadingFeature | undefined> {
  const readings = await loadEditorialEntries("bookReadings");
  if (readings.length === 0) return undefined;

  const next = readings.filter(isUpcoming).sort(bySoonestFirst)[0];
  const reading = next ?? readings[0];

  return {
    ...toRef("bookReadings", reading),
    location: reading.data.location,
  };
}

/** The most recent book the circle has read, with its cover. */
export async function loadLatestBook(): Promise<BookFeature | undefined> {
  const readings = await loadEditorialEntries("bookReadings");
  // A reading resolves to a book only when its ISBN matches a published book,
  // so the map is the honest source rather than the ISBN on the reading.
  const booksByReading = await loadReadingBooks();

  const latest = readings.find((entry) => booksByReading.has(entry.id));
  const book = latest ? booksByReading.get(latest.id) : undefined;
  if (!latest || !book) return undefined;

  return {
    title: book.data.title,
    authors: book.data.authors.join(", "),
    href: bookHref(book),
    cover: coverForIsbn(book.data.isbn),
    readOn: latest.data.date,
    sessions: readings.filter((entry) => entry.data.isbn === book.data.isbn)
      .length,
  };
}

export interface LeadArticle extends FeaturedRef {
  authors: string;
}

/** The newest writing: one at length, the rest as a short list beneath it. */
export async function loadWriting(more = 3) {
  const articles = await loadEditorialEntries("articles");
  const [first, ...rest] = articles;
  if (!first) return { lead: undefined, more: [] as FeaturedRef[] };

  return {
    lead: {
      ...toRef("articles", first),
      authors: first.data.authors.map((author) => author.name).join(", "),
    } satisfies LeadArticle,
    more: rest.slice(0, more).map((entry) => toRef("articles", entry)),
  };
}

/**
 * A short mixed index of the most recent work, so the homepage shows that the
 * organisation is active on several fronts at once rather than only writing.
 */
export async function loadRecentWork(
  exclude: readonly string[] = [],
  limit = 4,
): Promise<FeaturedRef[]> {
  const sources: EditorialCollection[] = [
    "pressReleases",
    "interventions",
    "programs",
    "conferences",
  ];

  const entries: FeaturedRef[] = [];
  for (const collection of sources) {
    const loaded = await loadEditorialEntries(collection);
    for (const entry of loaded) entries.push(toRef(collection, entry));
  }

  return entries
    .filter((entry) => !exclude.includes(entry.href))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}
