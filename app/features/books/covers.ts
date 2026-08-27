import type { ImageMetadata } from "astro";

/**
 * Cover art, keyed by the ISBN of the edition read. The files are fetched by
 * `scripts/fetch-book-covers.mjs` and committed, so Astro optimizes them at
 * build time rather than the page depending on a third party at runtime.
 *
 * A book with no cover file simply renders without one.
 */
const covers = import.meta.glob<{ default: ImageMetadata }>(
  "./assets/covers/*.{jpg,jpeg,png,webp}",
  { eager: true },
);

const byIsbn = new Map(
  Object.entries(covers).map(([file, module]) => [
    // "./assets/covers/9788189059637.jpg" -> "9788189059637"
    file.slice(file.lastIndexOf("/") + 1, file.lastIndexOf(".")),
    module.default,
  ]),
);

export const coverForIsbn = (isbn: string): ImageMetadata | undefined =>
  byIsbn.get(isbn);

/**
 * The cover sits beside the title and author everywhere it is used, so naming
 * the book again would only make a screen reader repeat itself.
 */
export const COVER_ALT = "";

/** Widths worth generating for an image that never renders very large. */
export const COVER_WIDTHS = [160, 224, 320, 448];
