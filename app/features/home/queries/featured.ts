import { loadReadingBooks } from "~/features/books/queries/books";
import {
  loadComicsIndex,
  type ComicSummary,
} from "~/features/comics/queries/comics";
import type { EditorialCollection } from "~/features/editorial/sections";
import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import {
  loadShelf,
  type Shelf,
  type ShelfBook,
} from "~/features/home/queries/shelf";
import {
  byNewestRefFirst,
  currentBook,
  featuredRef,
  spotlight,
  type BookFeature,
  type FeaturedRef,
  type Spotlight,
  type Writing,
} from "~/features/home/presenters";

export type {
  BookFeature,
  FeaturedRef,
  LeadArticle,
  Spotlight,
  Writing,
} from "~/features/home/presenters";

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

/* -------------------------------------------------------------------------- */
/* The spotlight: what AKSC is doing next                                     */
/* -------------------------------------------------------------------------- */

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

  return spotlight(conferences, programs);
}

/* -------------------------------------------------------------------------- */
/* The reading circle                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The book the circle is on: the one its next session works through, or the
 * one its last session did when nothing is scheduled.
 *
 * This deliberately does not mean "the last book read". The newest session is
 * usually one that has not happened yet — a reading is announced before it is
 * held — so picking it and calling it read states as done a thing the circle
 * has only planned. `currentBook` selects the same honest "on now" state for the
 * sessions that name a book.
 */
export async function loadCurrentBook(): Promise<BookFeature | undefined> {
  const [readings, booksByReading] = await Promise.all([
    loadEditorialEntries("bookReadings"),
    // A reading resolves to a book only when its stable id matches a
    // published book, so the map is the honest source rather than any field
    // stored on the reading itself.
    loadReadingBooks(),
  ]);

  return currentBook(readings, booksByReading);
}

/* -------------------------------------------------------------------------- */
/* Writing, and everything else that happened lately                          */
/* -------------------------------------------------------------------------- */

export async function loadWriting(limit = 3): Promise<Writing> {
  const [lead, ...rest] = await loadEditorialEntries("articles");
  if (!lead) return { more: [] };

  return {
    lead: {
      ...featuredRef("articles", lead),
      authors: lead.data.authors.map((author) => author.name).join(", "),
    },
    more: rest.slice(0, limit).map((entry) => featuredRef("articles", entry)),
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
        featuredRef(collection, entry),
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
  book?: BookFeature;
  /** The book read before the current one, set beside it rather than in the row. */
  previous?: ShelfBook;
  shelf: Shelf;
  comics: ComicSummary[];
  recent: FeaturedRef[];
}

/**
 * Everything the homepage shows below the hero, assembled here rather than in
 * the page, so the page is a list of sections and this is the only place that
 * knows how they are chosen.
 */
export async function loadHomeFeatures(): Promise<HomeFeatures> {
  const [spotlight, writing, book, wholeShelf, drawn] = await Promise.all([
    loadSpotlight(),
    loadWriting(),
    loadCurrentBook(),
    loadShelf(),
    loadComicsIndex(),
  ]);

  /*
   * The book on now is set at size, and the one before it fills the column
   * beside it, so neither is also a cover in the row beneath them. The counts
   * still describe the whole shelf, because they are the circle's record and
   * not a caption for the row.
   */
  const [previous, ...rest] = wholeShelf.books.filter(
    (entry) => entry.href !== book?.href,
  );
  const shelf: Shelf = { ...wholeShelf, books: rest };

  // Nothing already shown above should reappear in the closing index.
  const shown = [
    spotlight?.href,
    writing.lead?.href,
    ...writing.more.map((entry) => entry.href),
  ].filter((href): href is string => Boolean(href));

  return {
    spotlight,
    writing,
    book,
    previous,
    shelf,
    // The homepage shows the covers, not the whole shelf; the index is one
    // click away and is the place that lists everything.
    comics: drawn.comics.slice(0, 2),
    recent: await loadRecentWork(shown),
  };
}
