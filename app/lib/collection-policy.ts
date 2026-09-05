/**
 * Pure ordering and calendar policies, re-exported by `collections.ts`.
 * Presenters can use these without loading Astro's build-only content API;
 * collection access and the single publication rule remain in that module.
 */

export interface Identified {
  id: string;
}

/** An entry that carries a publication or event date. */
export interface Dated {
  data: { date: Date };
}

/** IDs are stable even when equally dated entries finish loading out of order. */
export const byId = (a: Identified, b: Identified): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Newest first, then stable ID order for entries on the same date. */
export const byNewestFirst = (
  a: Dated & Identified,
  b: Dated & Identified,
): number => b.data.date.getTime() - a.data.date.getTime() || byId(a, b);

/** Soonest first, with the same ID order as archives when dates tie. */
export const bySoonestFirst = (
  a: Dated & Identified,
  b: Dated & Identified,
): number => a.data.date.getTime() - b.data.date.getTime() || byId(a, b);

/** Date-only editorial records stay on their UTC day on every build host. */
export const startOfToday = (): Date => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

/** A date-only entry remains upcoming throughout its calendar day. */
export const isUpcoming = (entry: Dated): boolean =>
  entry.data.date.getTime() >= startOfToday().getTime();
