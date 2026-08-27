import { getCollection, type CollectionEntry } from "astro:content";

/**
 * The five collections that share the editorial base schema. They are listed,
 * sorted, and linked by the same code, so a change to one section's chrome
 * lands on all five.
 */
export type EditorialCollection =
  | "articles"
  | "pressReleases"
  | "interventions"
  | "conferences"
  | "bookReadings";

export type EditorialEntry<
  C extends EditorialCollection = EditorialCollection,
> = CollectionEntry<C>;

interface SectionDefinition {
  /** Route the section is published under, without a trailing slash. */
  readonly path: `/${string}`;
  readonly label: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  /** Shown on an index that has no entries yet. */
  readonly empty: string;
}

export const editorialSections = {
  articles: {
    path: "/blog",
    label: "Blog",
    eyebrow: "Writing",
    title: "Blog",
    description:
      "Essays, speeches, and analysis from the Ambedkar King Study Circle and the people organising with it.",
    empty: "The first articles are being prepared. Please check back soon.",
  },
  pressReleases: {
    path: "/press-releases",
    label: "Press Releases",
    eyebrow: "Newsroom",
    title: "Press Releases and Statements",
    description:
      "Statements AKSC has issued on caste discrimination, legislation, litigation, and solidarity with other movements.",
    empty: "No statements have been published yet.",
  },
  interventions: {
    path: "/interventions",
    label: "Interventions",
    eyebrow: "Action",
    title: "Interventions",
    description:
      "The campaigns, legal work, testimony gathering, and public education AKSC has taken up since 2016.",
    empty: "No interventions have been published yet.",
  },
  conferences: {
    path: "/conferences",
    label: "Conferences",
    eyebrow: "Gatherings",
    title: "Conferences",
    description:
      "Programmes, speakers, and resolutions from the AKSC annual conference, held every year since 2018.",
    empty: "No conferences have been published yet.",
  },
  bookReadings: {
    path: "/book-readings",
    label: "Book Readings",
    eyebrow: "Reading and Discussions",
    title: "Book Readings",
    description:
      "AKSC reads together. Every few weeks the circle works through a book, a reading list, or an academic paper, and discusses it in the open.",
    empty: "No readings have been published yet.",
  },
} as const satisfies Record<EditorialCollection, SectionDefinition>;

/**
 * Drafts are visible while writing and hidden from the built site, so an
 * unfinished entry can be previewed without being published.
 */
const isPublished = (entry: { data: { draft: boolean } }) =>
  import.meta.env.DEV || !entry.data.draft;

const byNewestFirst = (
  a: { data: { date: Date } },
  b: { data: { date: Date } },
) => b.data.date.getTime() - a.data.date.getTime();

export async function loadEditorialEntries<C extends EditorialCollection>(
  collection: C,
): Promise<EditorialEntry<C>[]> {
  const entries = await getCollection(collection);
  return entries.filter(isPublished).sort(byNewestFirst);
}

export const entryHref = (collection: EditorialCollection, id: string) =>
  `${editorialSections[collection].path}/${id}/`;

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const formatDate = (date: Date) => dayFormatter.format(date);
export const formatMonth = (date: Date) => monthFormatter.format(date);

// A reading is scheduled at a time of day, not just on a date, and the circle
// keeps Pacific time wherever members join from.
const pacificDayFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "America/Los_Angeles",
});

const pacificTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
  timeZone: "America/Los_Angeles",
});

export const formatPacificDate = (date: Date) =>
  pacificDayFormatter.format(date);
export const formatPacificTime = (date: Date) =>
  pacificTimeFormatter.format(date);

/** ISO date without the time part, for a `<time datetime>` attribute. */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function formatDateRange(start: Date, end?: Date) {
  if (!end || isoDate(end) === isoDate(start)) {
    return formatDate(start);
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** "1st", "2nd", "3rd", "4th" — used for conference editions. */
export function ordinal(value: number) {
  const remainderOfTen = value % 10;
  const remainderOfHundred = value % 100;
  if (remainderOfTen === 1 && remainderOfHundred !== 11) return `${value}st`;
  if (remainderOfTen === 2 && remainderOfHundred !== 12) return `${value}nd`;
  if (remainderOfTen === 3 && remainderOfHundred !== 13) return `${value}rd`;
  return `${value}th`;
}
