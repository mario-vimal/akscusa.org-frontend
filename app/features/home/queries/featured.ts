import type { ImageMetadata } from "astro";

import { coverForIsbn } from "~/features/books/covers";
import { bookAuthors } from "~/features/books/presenters";
import { bookHref, loadReadingBooks } from "~/features/books/queries/books";
import {
  loadComicsIndex,
  type ComicSummary,
} from "~/features/comics/queries/comics";
import {
  editorialSections,
  entryHref,
  type EditorialCollection,
  type EditorialEntry,
} from "~/features/editorial/sections";
import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import { bySoonestFirst, isUpcoming, type Dated } from "~/lib/collections";

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

/**
 * The shape every homepage feature reduces to: enough to render a link with a
 * date and a section, and nothing else. Components take these rather than raw
 * collection entries, so a schema change cannot quietly reshape the homepage.
 */
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

const byNewestRefFirst = (a: FeaturedRef, b: FeaturedRef) =>
  b.date.getTime() - a.date.getTime();

/* -------------------------------------------------------------------------- */
/* The spotlight: what AKSC is doing next                                     */
/* -------------------------------------------------------------------------- */

export interface Spotlight extends FeaturedRef {
  /** A conference theme, when the spotlight is a conference that names one. */
  theme?: string;
  location?: string;
  registrationUrl?: string;
}

/**
 * A conference or a program, carrying which of the two it is.
 *
 * The two collections are considered together but have different fields, so the
 * collection travels with the entry instead of being worked out again later.
 * That is what lets `toSpotlight` read `theme` off a conference without a cast.
 */
type Gathering =
  | { collection: "conferences"; entry: EditorialEntry<"conferences"> }
  | { collection: "programs"; entry: EditorialEntry<"programs"> };

const toSpotlight = (gathering: Gathering): Spotlight => {
  if (gathering.collection === "conferences") {
    const { entry } = gathering;
    return {
      ...toRef("conferences", entry),
      theme: entry.data.theme,
      location: entry.data.location,
      registrationUrl: entry.data.registrationUrl,
    };
  }

  const { entry } = gathering;
  return {
    ...toRef("programs", entry),
    location: entry.data.location,
    registrationUrl: entry.data.registrationUrl,
  };
};

/**
 * The one thing worth interrupting a reader for: what AKSC is doing next.
 *
 * An entry an editor marked `featured` wins. Otherwise the soonest upcoming
 * gathering wins, and if nothing is scheduled the most recent one stands in, so
 * the band never empties out between conferences.
 */
export async function loadSpotlight(): Promise<Spotlight | undefined> {
  const [conferences, programs] = await Promise.all([
    loadEditorialEntries("conferences"),
    loadEditorialEntries("programs"),
  ]);

  const gatherings: Gathering[] = [
    ...conferences.map((entry): Gathering => ({
      collection: "conferences",
      entry,
    })),
    ...programs.map((entry): Gathering => ({ collection: "programs", entry })),
  ];

  const isFlagged = ({ entry }: Gathering) => entry.data.featured;
  const ahead = ({ entry }: Gathering) => isUpcoming(entry);
  const soonest = (a: Gathering, b: Gathering) =>
    bySoonestFirst(a.entry, b.entry);

  const chosen =
    gatherings.filter(ahead).filter(isFlagged).sort(soonest)[0] ??
    gatherings.find(isFlagged) ??
    gatherings.filter(ahead).sort(soonest)[0] ??
    gatherings[0];

  return chosen ? toSpotlight(chosen) : undefined;
}

/* -------------------------------------------------------------------------- */
/* The reading circle                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The entry a dated section is currently on: the soonest one still to come,
 * or the most recent one when nothing is scheduled.
 *
 * Not simply the newest, which is the trap here. A reading is published weeks
 * before it is held, so the newest entry is normally one that has not happened
 * yet, and anything that treats it as the latest thing done says the circle
 * has read a book it has only announced. Entries arrive newest first, so the
 * fallback is the first of them.
 */
const currentOf = <T extends Dated>(entries: readonly T[]): T | undefined =>
  entries.filter(isUpcoming).sort(bySoonestFirst)[0] ?? entries[0];

export interface BookFeature {
  title: string;
  /** Absent for a book whose entry names no author. */
  authors?: string;
  href: string;
  cover?: ImageMetadata;
  /**
   * The day of the session this book is the book of: the next one when one is
   * scheduled, otherwise the last one held.
   */
  sessionOn: Date;
  /** How many sessions the circle has given it. */
  sessions: number;
}

export interface ReadingFeature extends FeaturedRef {
  location: string;
}

/**
 * The session the circle is holding next, or the last one it held.
 *
 * This and `loadCurrentBook` are separate because they are not always the same
 * entry. A session can be a set of articles rather than a book, in which case
 * the newest session has no cover to show and the newest *book* is a different
 * record. Keeping them apart means the band can show a cover without pretending
 * the circle read a book it did not.
 */
export async function loadReading(): Promise<ReadingFeature | undefined> {
  const readings = await loadEditorialEntries("bookReadings");
  const reading = currentOf(readings);
  if (!reading) return undefined;

  return {
    ...toRef("bookReadings", reading),
    location: reading.data.location,
  };
}

/**
 * The book the circle is on: the one its next session works through, or the
 * one its last session did when nothing is scheduled.
 *
 * This deliberately does not mean "the last book read". The newest session is
 * usually one that has not happened yet — a reading is announced before it is
 * held — so picking it and calling it read states as done a thing the circle
 * has only planned. `currentOf` is the same rule `loadReading` uses, applied
 * to the sessions that name a book.
 */
export async function loadCurrentBook(): Promise<BookFeature | undefined> {
  const [readings, booksByReading] = await Promise.all([
    loadEditorialEntries("bookReadings"),
    // A reading resolves to a book only when its stable id matches a
    // published book, so the map is the honest source rather than any field
    // stored on the reading itself.
    loadReadingBooks(),
  ]);

  const session = currentOf(
    readings.filter((entry) => booksByReading.has(entry.id)),
  );
  const book = session && booksByReading.get(session.id);
  if (!session || !book) return undefined;

  return {
    title: book.data.title,
    authors: bookAuthors(book),
    href: bookHref(book),
    cover: coverForIsbn(book.data.isbn),
    sessionOn: session.data.date,
    sessions: readings.filter(
      (entry) => booksByReading.get(entry.id)?.id === book.id,
    ).length,
  };
}

/* -------------------------------------------------------------------------- */
/* Writing, and everything else that happened lately                          */
/* -------------------------------------------------------------------------- */

export interface LeadArticle extends FeaturedRef {
  authors: string;
}

export interface Writing {
  /** The newest article, given room to be read. */
  lead?: LeadArticle;
  /** The ones after it, as a short list. */
  more: FeaturedRef[];
}

export async function loadWriting(limit = 3): Promise<Writing> {
  const [lead, ...rest] = await loadEditorialEntries("articles");
  if (!lead) return { more: [] };

  return {
    lead: {
      ...toRef("articles", lead),
      authors: lead.data.authors.map((author) => author.name).join(", "),
    },
    more: rest.slice(0, limit).map((entry) => toRef("articles", entry)),
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
  const sources = [
    "pressReleases",
    "interventions",
    "programs",
    "conferences",
  ] as const satisfies readonly EditorialCollection[];

  const loaded = await Promise.all(
    sources.map(async (collection) =>
      (await loadEditorialEntries(collection)).map((entry) =>
        toRef(collection, entry),
      ),
    ),
  );

  return loaded
    .flat()
    .filter((entry) => !exclude.includes(entry.href))
    .sort(byNewestRefFirst)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* The whole page                                                             */
/* -------------------------------------------------------------------------- */

export interface HomeFeatures {
  spotlight?: Spotlight;
  writing: Writing;
  reading?: ReadingFeature;
  book?: BookFeature;
  comics: ComicSummary[];
  recent: FeaturedRef[];
}

/**
 * Everything the homepage shows below the hero, assembled here rather than in
 * the page, so the page is a list of sections and this is the only place that
 * knows how they are chosen.
 */
export async function loadHomeFeatures(): Promise<HomeFeatures> {
  const [spotlight, writing, reading, book, drawn] = await Promise.all([
    loadSpotlight(),
    loadWriting(),
    loadReading(),
    loadCurrentBook(),
    loadComicsIndex(),
  ]);

  // Nothing already shown above should reappear in the closing index.
  const shown = [
    spotlight?.href,
    writing.lead?.href,
    reading?.href,
    ...writing.more.map((entry) => entry.href),
  ].filter((href): href is string => Boolean(href));

  return {
    spotlight,
    writing,
    reading,
    book,
    // The homepage shows the covers, not the whole shelf; the index is one
    // click away and is the place that lists everything.
    comics: drawn.comics.slice(0, 2),
    recent: await loadRecentWork(shown),
  };
}
