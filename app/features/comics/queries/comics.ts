import { type CollectionEntry } from "astro:content";

import { sizePanels, type SizedPanel } from "~/features/artwork/panels";
import { byNewestFirst, loadPublished } from "~/lib/collections";

export type Comic = CollectionEntry<"comics">;

/** Where the comics are published, named once so links cannot drift. */
export const comicsPath = "/comics";

export const comicHref = (id: string) => `${comicsPath}/${id}/`;

export const loadComics = (): Promise<Comic[]> =>
  loadPublished("comics", byNewestFirst);

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

/** A comic as the index card shows it: a cover, a credit, and a count. */
export interface ComicSummary {
  href: string;
  title: string;
  summary: string;
  /** The comic's title panel, used as its cover. */
  cover: SizedPanel;
  credit: string;
  panelCount: string;
  contentNote?: string;
}

export interface ComicsIndexData {
  comics: ComicSummary[];
  /** Every panel published across every comic, for the index's count. */
  totalPanels: number;
}

/**
 * The comics index, with each cover measured.
 *
 * The sizes are read off the committed files at build time because these
 * panels are served from the public directory rather than imported, so Astro
 * never sees them and cannot supply their dimensions itself.
 */
export async function loadComicsIndex(): Promise<ComicsIndexData> {
  const comics = await loadComics();

  const summaries = await Promise.all(
    comics.map(async (comic): Promise<ComicSummary> => {
      const [cover] = await sizePanels([comic.data.panels[0]]);

      return {
        href: comicHref(comic.id),
        title: comic.data.title,
        summary: comic.data.summary,
        cover,
        credit: creditLine(comic),
        panelCount: panelCount(comic),
        contentNote: comic.data.contentNote,
      };
    }),
  );

  return {
    comics: summaries,
    totalPanels: comics.reduce(
      (total, comic) => total + comic.data.panels.length,
      0,
    ),
  };
}
