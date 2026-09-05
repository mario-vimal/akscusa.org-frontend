import {
  getCollection,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";

export {
  byId,
  byNewestFirst,
  bySoonestFirst,
  isUpcoming,
  startOfToday,
  type Dated,
  type Identified,
} from "./collection-policy";

/**
 * The rules every content collection on this site shares: what counts as
 * published, and what order entries come back in.
 *
 * These lived as private copies inside six different query modules, which meant
 * six places to change if the draft rule ever changed and no way to tell,
 * reading one of them, whether it agreed with the others. Publication stays
 * here; the pure ordering and calendar policies are re-exported so presenters
 * can test the same policies without importing Astro's collection loader.
 */

/** An entry that can be withheld from the built site while it is written. */
export interface Draftable {
  data: { draft: boolean };
}

/**
 * The collections whose entries carry a `draft` flag, worked out from the
 * schemas rather than listed by hand, so passing a collection that has no such
 * flag to `loadPublished` is a type error rather than a silent no-op.
 */
export type DraftableCollection = {
  [K in CollectionKey]: CollectionEntry<K> extends Draftable ? K : never;
}[CollectionKey];

/**
 * Drafts are visible in `npm run dev` and left out of the build, so an
 * unfinished entry can be previewed without being published.
 */
export const isPublished = (entry: Draftable): boolean =>
  import.meta.env.DEV || !entry.data.draft;

/**
 * Every published entry of a collection, in the order given.
 *
 * The comparator is required because there is no order that suits every
 * collection: an archive reads newest first, a playbook reads in the sequence
 * its authors chose, and a roster reads alphabetically. Making it explicit at
 * the call site means the order of a list is stated where the list is loaded.
 */
export async function loadPublished<K extends DraftableCollection>(
  collection: K,
  compare: (a: CollectionEntry<K>, b: CollectionEntry<K>) => number,
): Promise<CollectionEntry<K>[]> {
  const entries = await getCollection(collection);
  return entries.filter(isPublished).sort(compare);
}
