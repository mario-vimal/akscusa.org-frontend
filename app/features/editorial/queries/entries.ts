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
