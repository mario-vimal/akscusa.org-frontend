/**
 * Shared vocabulary for the three editorial collections: articles (the blog),
 * press releases, and interventions.
 *
 * Every list here is the single source of truth. `app/content.config.ts` turns
 * these into Zod enums, the pages render the labels, and the matching Sveltia
 * `select` options in `cms/public/admin/config.yml` are kept in step by
 * `scripts/cms/config.test.ts`.
 */

export interface TaxonomyTerm {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

/**
 * Cross-cutting subjects. Every editorial entry can carry topics, so a blog
 * article, a press release, and an intervention about the same campaign are
 * relatable without duplicating them across collections.
 */
export const editorialTopics = [
  {
    id: "caste-discrimination",
    label: "Caste discrimination",
    description: "How caste is practised, denied, and challenged.",
  },
  {
    id: "ambedkar",
    label: "Dr. Ambedkar",
    description:
      "The writing, jurisprudence, and legacy of Dr. B. R. Ambedkar.",
  },
  {
    id: "periyar",
    label: "Periyar",
    description: "Periyar E. V. Ramasamy and the Self-Respect Movement.",
  },
  {
    id: "legislation",
    label: "Legislation",
    description:
      "Bills, amendments, and ballot measures AKSC has campaigned on.",
  },
  {
    id: "litigation",
    label: "Litigation",
    description: "Court cases that shape civil rights for the caste-oppressed.",
  },
  {
    id: "workplace",
    label: "Workplace",
    description: "Caste in hiring, management, and the technology industry.",
  },
  {
    id: "higher-education",
    label: "Higher education",
    description: "Universities, campus policy, and student protection.",
  },
  {
    id: "solidarity",
    label: "Solidarity",
    description: "Joint work with allied movements against oppression.",
  },
  {
    id: "history",
    label: "History",
    description: "Historical events read through an anti-caste lens.",
  },
  {
    id: "religion-and-culture",
    label: "Religion and culture",
    description: "Ritual, custom, and cultural practice as sites of caste.",
  },
  {
    id: "hindutva",
    label: "Hindutva",
    description: "Hindu supremacist organising in India and the diaspora.",
  },
  {
    id: "civil-rights",
    label: "Civil rights",
    description: "Race, caste, and the wider struggle for equal protection.",
  },
] as const satisfies readonly TaxonomyTerm[];

/**
 * Blog categories. Each article has exactly one, so the blog index can be
 * browsed as a small set of coherent shelves rather than a flat archive.
 */
export const articleCategories = [
  {
    id: "ambedkarite-thought",
    label: "Ambedkarite Thought",
    description:
      "Readings of Dr. Ambedkar's writing and the ideas that guide the movement.",
  },
  {
    id: "caste-in-the-usa",
    label: "Caste in the USA",
    description:
      "How caste travels with the diaspora and surfaces in American workplaces and campuses.",
  },
  {
    id: "history-and-movements",
    label: "History and Movements",
    description:
      "Anti-caste history and the movements that carried it forward.",
  },
  {
    id: "culture-and-society",
    label: "Culture and Society",
    description:
      "Ritual, custom, and everyday life examined through an anti-caste lens.",
  },
  {
    id: "books-and-media",
    label: "Books and Media",
    description: "Reviews and responses to books, films, and reporting.",
  },
] as const satisfies readonly TaxonomyTerm[];

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

type Ids<T extends readonly TaxonomyTerm[]> = T[number]["id"];

export type EditorialTopic = Ids<typeof editorialTopics>;
export type ArticleCategory = Ids<typeof articleCategories>;
export type InterventionKind = Ids<typeof interventionKinds>;
export type InterventionStatus = Ids<typeof interventionStatuses>;
export type ConferenceFormat = Ids<typeof conferenceFormats>;
export type GeneralBodyPaperKind = Ids<typeof generalBodyPaperKinds>;

/**
 * Zod's `enum` needs a non-empty tuple of literals, which `.map()` cannot
 * produce on its own, so the cast preserves the literal ids from the lists.
 */
const idsOf = <const T extends readonly TaxonomyTerm[]>(terms: T) =>
  terms.map((term) => term.id) as unknown as [Ids<T>, ...Ids<T>[]];

export const editorialTopicIds = idsOf(editorialTopics);
export const articleCategoryIds = idsOf(articleCategories);
export const interventionKindIds = idsOf(interventionKinds);
export const interventionStatusIds = idsOf(interventionStatuses);
export const conferenceFormatIds = idsOf(conferenceFormats);
export const generalBodyPaperKindIds = idsOf(generalBodyPaperKinds);

const labelLookup = (terms: readonly TaxonomyTerm[]) =>
  new Map(terms.map((term) => [term.id, term.label]));

const topicLabels = labelLookup(editorialTopics);
const categoryLabels = labelLookup(articleCategories);
const kindLabels = labelLookup(interventionKinds);
const statusLabels = labelLookup(interventionStatuses);
const formatLabels = labelLookup(conferenceFormats);
const generalBodyPaperKindLabels = labelLookup(generalBodyPaperKinds);

export const topicLabel = (id: EditorialTopic) => topicLabels.get(id) ?? id;
export const articleCategoryLabel = (id: ArticleCategory) =>
  categoryLabels.get(id) ?? id;
export const interventionKindLabel = (id: InterventionKind) =>
  kindLabels.get(id) ?? id;
export const interventionStatusLabel = (id: InterventionStatus) =>
  statusLabels.get(id) ?? id;
export const conferenceFormatLabel = (id: ConferenceFormat) =>
  formatLabels.get(id) ?? id;
export const generalBodyPaperKindLabel = (id: GeneralBodyPaperKind) =>
  generalBodyPaperKindLabels.get(id) ?? id;
