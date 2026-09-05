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

import {
  byTermLabel,
  termLabels,
  type Term,
} from "~/features/editorial/vocabulary";

/** Which vocabulary a term belongs to. */
export type Vocabulary = "topics" | "categories";

/** Every term in a vocabulary, alphabetically. */
export async function loadTerms(vocabulary: Vocabulary): Promise<Term[]> {
  const entries = await getCollection(vocabulary);

  return entries
    .map((entry) => ({
      id: entry.id,
      label: entry.data.label,
      description: entry.data.description,
    }))
    .sort(byTermLabel);
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
  return termLabels(await loadTerms(vocabulary));
}
