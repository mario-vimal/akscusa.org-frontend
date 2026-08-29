import { type CollectionEntry } from "astro:content";

/**
 * The six collections that share the editorial base schema. They are listed,
 * sorted, and linked by the same code, so a change to one section's chrome
 * lands on all six.
 */
export type EditorialCollection =
  | "articles"
  | "pressReleases"
  | "interventions"
  | "conferences"
  | "programs"
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
  programs: {
    path: "/programs",
    label: "Programs",
    eyebrow: "Learn and gather",
    title: "Programs",
    description:
      "Public events and initiatives through which AKSC studies anti-caste thought, develops young leaders, and gathers the community.",
    empty: "No programs have been published yet.",
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

export const entryHref = (collection: EditorialCollection, id: string) =>
  `${editorialSections[collection].path}/${id}/`;
