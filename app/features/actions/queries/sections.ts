import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import { editorialSections } from "~/features/editorial/sections";
import {
  actionCollections,
  type ActionCollection,
} from "~/features/actions/sections";

/**
 * What each section is counted in. `Press Releases` counts statements, which is
 * what its own masthead calls them; counting "press releases" would make the
 * hub read as a list of formats rather than a list of work.
 */
const countedNoun = {
  interventions: { one: "intervention", many: "interventions" },
  pressReleases: { one: "statement", many: "statements" },
  conferences: { one: "conference", many: "conferences" },
  programs: { one: "program", many: "programs" },
} as const satisfies Record<ActionCollection, { one: string; many: string }>;

/** A section as the Actions hub prints it. */
export interface ActionSectionSummary {
  title: string;
  description: string;
  href: string;
  /** How much is published there, for example "16 interventions". */
  meta: string;
}

/**
 * The four sections under Actions, each with a live count.
 *
 * The count is why the hub is worth opening rather than being the menu printed
 * as a page: it says which of the four has anything in it before a reader
 * chooses one.
 *
 * Each is titled with the section's short label, which is what the menu shows.
 * A reader who followed `Press Releases` should not arrive at a list headed
 * something else.
 */
export const loadActionSections = async (): Promise<ActionSectionSummary[]> =>
  Promise.all(
    actionCollections.map(async (collection) => {
      const section = editorialSections[collection];
      const entries = await loadEditorialEntries(collection);
      const noun = countedNoun[collection];

      return {
        title: section.label,
        description: section.description,
        href: `${section.path}/`,
        meta: `${entries.length} ${entries.length === 1 ? noun.one : noun.many}`,
      };
    }),
  );
