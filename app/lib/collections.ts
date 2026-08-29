import {
  getCollection,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";

/**
 * The rules every content collection on this site shares: what counts as
 * published, and what order entries come back in.
 *
 * These lived as private copies inside six different query modules, which meant
 * six places to change if the draft rule ever changed and no way to tell,
 * reading one of them, whether it agreed with the others. They are defined once
 * here and imported.
 */

/** An entry that can be withheld from the built site while it is written. */
export interface Draftable {
  data: { draft: boolean };
}

/** An entry that carries a publication or event date. */
export interface Dated {
  data: { date: Date };
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

/** Newest first: the order an archive is read in. */
export const byNewestFirst = (a: Dated, b: Dated): number =>
  b.data.date.getTime() - a.data.date.getTime();

/** Soonest first: the order a list of upcoming events is read in. */
export const bySoonestFirst = (a: Dated, b: Dated): number =>
  a.data.date.getTime() - b.data.date.getTime();

/**
 * Midnight today, UTC, so an event happening today still counts as upcoming.
 * Dates across this site are read as UTC, which keeps a build reproducible
 * wherever it runs.
 */
export const startOfToday = (): Date => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

/** Whether a dated entry is today or still to come. */
export const isUpcoming = (entry: Dated): boolean =>
  entry.data.date.getTime() >= startOfToday().getTime();

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
