import { getCollection, type CollectionEntry } from "astro:content";

export type Comic = CollectionEntry<"comics">;

/** Where the comics are published, named once so links cannot drift. */
export const comicsPath = "/comics";

export const comicHref = (id: string) => `${comicsPath}/${id}/`;

/**
 * Drafts are visible while writing and left out of the build, so an artist can
 * preview a comic before it is published.
 */
const isPublished = (comic: Comic) => import.meta.env.DEV || !comic.data.draft;

export async function loadComics(): Promise<Comic[]> {
  const comics = await getCollection("comics");

  return comics
    .filter(isPublished)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** How a comic is credited in one line, for a card or a byline. */
export function creditLine(comic: Comic): string {
  return comic.data.credits
    .map((credit) =>
      credit.role ? `${credit.name} (${credit.role})` : credit.name,
    )
    .join(" · ");
}

export function panelCount(comic: Comic): string {
  const total = comic.data.panels.length;
  return `${total} ${total === 1 ? "panel" : "panels"}`;
}

/**
 * The comic before and after this one in the published order, so a reader who
 * finishes one is offered the next rather than a dead end.
 */
export function neighbours(comics: Comic[], id: string) {
  const index = comics.findIndex((comic) => comic.id === id);

  return {
    previous: index > 0 ? comics[index - 1] : undefined,
    next:
      index >= 0 && index < comics.length - 1 ? comics[index + 1] : undefined,
  };
}
