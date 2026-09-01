import { byNewestFirst, loadPublished } from "~/lib/collections";
import type {
  EditorialCollection,
  EditorialEntry,
} from "~/features/editorial/sections";

/** Every published entry of an editorial section, newest first. */
export const loadEditorialEntries = <C extends EditorialCollection>(
  collection: C,
): Promise<EditorialEntry<C>[]> => loadPublished(collection, byNewestFirst);

/**
 * Splits a section's entries into the one that leads the index and the rest.
 *
 * An index of equal cards has no first paragraph: nothing on it says which
 * entry is the newest or which one a reader who has been here before has not
 * seen. Promoting the newest entry gives the page somewhere to start.
 *
 * Below three entries there is no lead. A lead over a single remaining card
 * looks like a mistake rather than an emphasis, and a short index is already
 * legible without one.
 *
 * The generic is the entry type rather than the collection name. TypeScript
 * cannot infer `C` back out of `CollectionEntry<C>`, so a signature written
 * over the collection silently widens every entry to the union of all six and
 * a press release then fails to type as a press release at the call site.
 */
export function splitLeadEntry<E extends EditorialEntry>(
  entries: readonly E[],
): { lead?: E; rest: readonly E[] } {
  if (entries.length < 3) {
    return { rest: entries };
  }

  const [lead, ...rest] = entries;
  return { lead, rest };
}

/** A controlled-vocabulary term, as defined in `taxonomy.ts`. */
interface Term {
  id: string;
}

/**
 * Declared as a type rather than an interface on purpose: Astro's
 * `GetStaticPaths` requires props to be indexable, and only a type alias gets
 * the implicit index signature that satisfies it.
 */
export type TermGroup<C extends EditorialCollection, T extends Term> = {
  term: T;
  /** The entries filed under this term. */
  entries: EditorialEntry<C>[];
  /** Every entry in the section, which the filter row needs to count by term. */
  all: EditorialEntry<C>[];
};

/**
 * A section's entries grouped by one of its vocabularies, keeping only the
 * terms that have entries.
 *
 * Both `/blog/category/<id>/` and `/interventions/kind/<id>/` are this same
 * page: pick a vocabulary, group by it, and do not publish a term nobody has
 * used. Written once, the rule that an empty term gets no page cannot come to
 * differ between the two.
 */
export async function groupByTerm<
  C extends EditorialCollection,
  T extends Term,
>(
  collection: C,
  terms: readonly T[],
  termOf: (entry: EditorialEntry<C>) => string | undefined,
): Promise<TermGroup<C, T>[]> {
  const all = await loadEditorialEntries(collection);

  return terms
    .map((term) => ({
      term,
      entries: all.filter((entry) => termOf(entry) === term.id),
      all,
    }))
    .filter((group) => group.entries.length > 0);
}
