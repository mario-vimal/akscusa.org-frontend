import { byNewestFirst, loadPublished } from "~/lib/collections";
import type {
  EditorialCollection,
  EditorialEntry,
} from "~/features/editorial/sections";

/** Every published entry of an editorial section, newest first. */
export const loadEditorialEntries = <C extends EditorialCollection>(
  collection: C,
): Promise<EditorialEntry<C>[]> => loadPublished(collection, byNewestFirst);

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
