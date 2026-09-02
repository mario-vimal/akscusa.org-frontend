/**
 * Reads the editor-maintained vocabularies in `cms/content/topics/` and
 * `cms/content/categories/`.
 *
 * Everything that prints a term goes through here, because a term an editor
 * has since removed must not take a page down with it: an id with no entry
 * behind it prints as itself rather than throwing, so a deleted topic leaves a
 * plain chip on the entries that carried it instead of a broken build.
 */

import { getCollection } from "astro:content";

/** Which vocabulary a term belongs to. */
export type Vocabulary = "topics" | "categories";

export interface Term {
  /** The entry's filename, which is what an entry stores. */
  id: string;
  label: string;
  description?: string;
}

/**
 * Alphabetical by label. A curated order would need an editor to maintain a
 * position on every term to add one in the middle, and a filter row a reader
 * scans is easier to find a term in when it is ordered the way a list of names
 * is ordered.
 */
const byLabel = (a: Term, b: Term) => a.label.localeCompare(b.label);

/** Every term in a vocabulary, alphabetically. */
export async function loadTerms(vocabulary: Vocabulary): Promise<Term[]> {
  const entries = await getCollection(vocabulary);

  return entries
    .map((entry) => ({
      id: entry.id,
      label: entry.data.label,
      description: entry.data.description,
    }))
    .sort(byLabel);
}

/**
 * A lookup from stored id to printed label.
 *
 * Components take this rather than calling a global helper, because the labels
 * now come from content and reading content is asynchronous: the page or
 * component that renders the chips loads the vocabulary once and prints from
 * it, instead of every chip reaching for a module-level table that a build
 * would have had to populate before rendering began.
 */
export async function loadTermLabels(
  vocabulary: Vocabulary,
): Promise<(id: string) => string> {
  const terms = await loadTerms(vocabulary);
  const labels = new Map(terms.map((term) => [term.id, term.label]));

  return (id) => labels.get(id) ?? id;
}

/**
 * The terms of a vocabulary that entries actually use, in vocabulary order.
 *
 * A filter row is built from this so a chip never empties the list it filters,
 * and so a term an editor has added but not yet filed anything under does not
 * advertise an empty shelf.
 */
export function termsInUse<E>(
  terms: readonly Term[],
  entries: readonly E[],
  termOf: (entry: E) => string | undefined,
): Term[] {
  const used = new Set(entries.map(termOf));
  return terms.filter((term) => used.has(term.id));
}
