/**
 * What every place that prints a cover agrees about it.
 *
 * The cover itself belongs to the book entry: it is uploaded through the CMS,
 * committed under `cms/public/media/books/`, and read straight off
 * `book.data.cover`. There is no lookup here because there is nothing to look
 * up — a cover keyed by ISBN in code is a picture no editor can change, and a
 * book whose cover is missing then needs a developer rather than an upload.
 *
 * A book with no cover renders without one.
 */

/**
 * The cover sits beside the title and author everywhere it is used, so naming
 * the book again would only make a screen reader repeat itself.
 */
export const COVER_ALT = "";

/** Widths worth generating for an image that never renders very large. */
export const COVER_WIDTHS = [160, 224, 320, 448];
