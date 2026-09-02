/**
 * The structural vocabularies: the fixed sets of terms the templates are
 * written against.
 *
 * A term here decides what the site does with an entry — whether a concluded
 * intervention prints a date range, which shelf a program falls on, what a
 * General Body paper is called — so adding one means writing the behaviour
 * that goes with it. That is why these stay in code while topics and blog
 * categories moved to `cms/content/`, where an editor maintains them without
 * a developer.
 *
 * Every list here is the single source of truth. The schemas in `app/schemas/`
 * turn them into Zod enums, the pages render the labels, and the matching
 * Sveltia `select` options in `cms/public/admin/config.yml` are kept in step by
 * `scripts/cms/config.test.ts`.
 */

export interface TaxonomyTerm {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

/** What kind of work an intervention is, so the index can be scanned by shape. */
export const interventionKinds = [
  {
    id: "legislative",
    label: "Legislative",
    description:
      "Campaigning for or against a bill, amendment, or ballot measure.",
  },
  {
    id: "legal",
    label: "Legal",
    description: "Court cases and the documentation that supports them.",
  },
  {
    id: "campaign",
    label: "Campaign",
    description: "Protests, memoranda, and public pressure on institutions.",
  },
  {
    id: "education",
    label: "Education",
    description:
      "Discussion series and curricula that build public understanding.",
  },
  {
    id: "testimony",
    label: "Testimony",
    description: "Gathering and publishing first-hand accounts of caste.",
  },
] as const satisfies readonly TaxonomyTerm[];

/** Whether an intervention still needs participation. */
export const interventionStatuses = [
  {
    id: "ongoing",
    label: "Ongoing",
    description: "Still active and open to participation.",
  },
  {
    id: "concluded",
    label: "Concluded",
    description: "Completed, kept as a record of the work.",
  },
] as const satisfies readonly TaxonomyTerm[];

/**
 * The papers a General Body meeting publishes. A meeting always submits a
 * report; it adopts resolutions only when there are any to adopt.
 */
export const generalBodyPaperKinds = [
  {
    id: "report",
    label: "Report",
    description: "The account of the year's work submitted to the meeting.",
  },
  {
    id: "resolutions",
    label: "Resolutions",
    description: "Resolutions put to, and adopted at, the meeting.",
  },
] as const satisfies readonly TaxonomyTerm[];

/** How a conference was held, so attendees know what to expect. */
export const conferenceFormats = [
  {
    id: "in-person",
    label: "In person",
    description: "Held at a venue, with no streamed participation.",
  },
  {
    id: "online",
    label: "Online",
    description: "Held entirely online.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Held at a venue and streamed for remote participants.",
  },
] as const satisfies readonly TaxonomyTerm[];

/** Whether a program is a public event or a longer-running initiative. */
export const programKinds = [
  {
    id: "event",
    label: "Event",
    description: "A gathering held on a particular date.",
  },
  {
    id: "initiative",
    label: "Initiative",
    description:
      "A program that recruits or works with participants over time.",
  },
] as const satisfies readonly TaxonomyTerm[];

/** Whether a program is still ahead or retained as an archive. */
export const programStatuses = [
  {
    id: "scheduled",
    label: "Scheduled",
    description: "Announced and still open for attendance or participation.",
  },
  {
    id: "concluded",
    label: "Concluded",
    description: "Finished, kept as a record of the program.",
  },
] as const satisfies readonly TaxonomyTerm[];

type Ids<T extends readonly TaxonomyTerm[]> = T[number]["id"];

export type InterventionKind = Ids<typeof interventionKinds>;
export type InterventionStatus = Ids<typeof interventionStatuses>;
export type ConferenceFormat = Ids<typeof conferenceFormats>;
export type ProgramKind = Ids<typeof programKinds>;
export type ProgramStatus = Ids<typeof programStatuses>;
export type GeneralBodyPaperKind = Ids<typeof generalBodyPaperKinds>;

/**
 * Zod's `enum` needs a non-empty tuple of literals, which `.map()` cannot
 * produce on its own. Rather than assert the shape and hope, the emptiness is
 * checked here: an empty vocabulary would otherwise reach Zod as a broken enum
 * and fail somewhere much less obvious.
 */
const idsOf = <const T extends readonly TaxonomyTerm[]>(
  terms: T,
): [Ids<T>, ...Ids<T>[]] => {
  const [first, ...rest] = terms.map((term) => term.id as Ids<T>);

  if (first === undefined) {
    throw new Error("A taxonomy list must define at least one term.");
  }

  return [first, ...rest];
};

export const interventionKindIds = idsOf(interventionKinds);
export const interventionStatusIds = idsOf(interventionStatuses);
export const conferenceFormatIds = idsOf(conferenceFormats);
export const programKindIds = idsOf(programKinds);
export const programStatusIds = idsOf(programStatuses);
export const generalBodyPaperKindIds = idsOf(generalBodyPaperKinds);

const labelLookup = (terms: readonly TaxonomyTerm[]) =>
  new Map(terms.map((term) => [term.id, term.label]));

const kindLabels = labelLookup(interventionKinds);
const statusLabels = labelLookup(interventionStatuses);
const formatLabels = labelLookup(conferenceFormats);
const programKindLabels = labelLookup(programKinds);
const programStatusLabels = labelLookup(programStatuses);
const generalBodyPaperKindLabels = labelLookup(generalBodyPaperKinds);

export const interventionKindLabel = (id: InterventionKind) =>
  kindLabels.get(id) ?? id;
export const interventionStatusLabel = (id: InterventionStatus) =>
  statusLabels.get(id) ?? id;
export const conferenceFormatLabel = (id: ConferenceFormat) =>
  formatLabels.get(id) ?? id;
export const programKindLabel = (id: ProgramKind) =>
  programKindLabels.get(id) ?? id;
export const programStatusLabel = (id: ProgramStatus) =>
  programStatusLabels.get(id) ?? id;
export const generalBodyPaperKindLabel = (id: GeneralBodyPaperKind) =>
  generalBodyPaperKindLabels.get(id) ?? id;
