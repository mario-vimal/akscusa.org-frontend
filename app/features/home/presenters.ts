import {
  currentReading,
  isUpcomingReading,
} from "~/features/book-readings/calendar";
import { bookHref } from "~/features/books/links";
import { bookByline } from "~/features/books/presenters";
import type { BookWithAuthors } from "~/features/books/queries/books";
import { isUpcomingConference } from "~/features/editorial/calendar";
import {
  editorialSections,
  entryHref,
  type EditorialCollection,
  type EditorialEntry,
} from "~/features/editorial/sections";
import {
  byId,
  byNewestFirst,
  bySoonestFirst,
  isUpcoming,
} from "~/lib/collection-policy";

export interface FeaturedRef {
  collection: EditorialCollection;
  id: string;
  href: string;
  section: string;
  title: string;
  summary: string;
  date: Date;
  upcoming: boolean;
}

export const featuredRef = <C extends EditorialCollection>(
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
  upcoming:
    collection === "bookReadings"
      ? isUpcomingReading(entry)
      : collection === "conferences"
        ? isUpcomingConference(entry)
        : isUpcoming(entry),
});

export const byNewestRefFirst = (a: FeaturedRef, b: FeaturedRef): number =>
  byNewestFirst(
    { id: a.id, data: { date: a.date } },
    { id: b.id, data: { date: b.date } },
  ) || byId({ id: a.collection }, { id: b.collection });

export interface Spotlight extends FeaturedRef {
  theme?: string;
  location?: string;
  registrationUrl?: string;
}

type Gathering =
  | { collection: "conferences"; entry: EditorialEntry<"conferences"> }
  | { collection: "programs"; entry: EditorialEntry<"programs"> };

const toSpotlight = (gathering: Gathering): Spotlight => {
  if (gathering.collection === "conferences") {
    const { entry } = gathering;
    return {
      ...featuredRef("conferences", entry),
      theme: entry.data.theme,
      location: entry.data.location,
      registrationUrl: entry.data.registrationUrl,
    };
  }

  const { entry } = gathering;
  return {
    ...featuredRef("programs", entry),
    location: entry.data.location,
    registrationUrl: entry.data.registrationUrl,
  };
};

/**
 * Featured entries retain editorial precedence, followed by the soonest
 * upcoming gathering and then the latest across both collections.
 */
export function spotlight(
  conferences: readonly EditorialEntry<"conferences">[],
  programs: readonly EditorialEntry<"programs">[],
): Spotlight | undefined {
  const gatherings: Gathering[] = [
    ...conferences.map((entry): Gathering => ({
      collection: "conferences",
      entry,
    })),
    ...programs.map((entry): Gathering => ({ collection: "programs", entry })),
  ];

  const isFlagged = ({ entry }: Gathering) => entry.data.featured;
  const ahead = ({ collection, entry }: Gathering) =>
    collection === "conferences"
      ? isUpcomingConference(entry)
      : isUpcoming(entry);
  const soonest = (a: Gathering, b: Gathering) =>
    bySoonestFirst(a.entry, b.entry) ||
    byId({ id: a.collection }, { id: b.collection });
  const newest = (a: Gathering, b: Gathering) =>
    byNewestFirst(a.entry, b.entry) ||
    byId({ id: a.collection }, { id: b.collection });
  const recent = [...gatherings].sort(newest);

  const chosen =
    gatherings.filter(ahead).filter(isFlagged).sort(soonest)[0] ??
    recent.find(isFlagged) ??
    gatherings.filter(ahead).sort(soonest)[0] ??
    recent[0];

  return chosen ? toSpotlight(chosen) : undefined;
}

export interface BookFeature {
  title: string;
  authors?: string;
  href: string;
  cover?: string;
  /** The next session on this book, or the last held if none is scheduled. */
  sessionOn: Date;
  /** Published session records, including future ones. */
  sessions: number;
}

/** The same Pacific-day selection as the circle, limited to published books. */
export function currentBook(
  readings: readonly EditorialEntry<"bookReadings">[],
  booksByReading: ReadonlyMap<string, BookWithAuthors>,
): BookFeature | undefined {
  const session = currentReading(
    readings.filter((entry) => booksByReading.has(entry.id)),
  );
  const current = session && booksByReading.get(session.id);
  if (!session || !current) return undefined;

  const { book } = current;
  return {
    title: book.data.title,
    authors: bookByline(current),
    href: bookHref(book),
    cover: book.data.cover,
    sessionOn: session.data.date,
    sessions: readings.filter(
      (entry) => booksByReading.get(entry.id)?.book.id === book.id,
    ).length,
  };
}

export interface LeadArticle extends FeaturedRef {
  authors: string;
}

export interface Writing {
  lead?: LeadArticle;
  more: FeaturedRef[];
}
