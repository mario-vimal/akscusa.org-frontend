/**
 * The strings a page prints about a book.
 *
 * A book entry carries the metadata the site publishes. The two places that
 * cannot simply print nothing — a byline and the
 * meta description of the book's own page — are built here, once, rather than
 * each component deciding for itself what an absent field looks like.
 *
 * Both take a book with its authors already resolved rather than a
 * `CollectionEntry`, so they can be tested without `astro:content`, which only
 * exists inside an Astro build. An entry stores author slugs, so no byline is
 * ever built from what is written on the book itself.
 */

import type { AuthorLink } from "~/features/authors/links";

/** Enough of a book and its authors to build the strings a page prints. */
export interface PresentableBook {
  book: { data: { title: string; summary?: string } };
  authors: readonly { id: string; data: { name: string } }[];
}

/** The authors on one line, or nothing when the entry names none. */
export function bookByline(entry: PresentableBook): string | undefined {
  return entry.authors.length > 0
    ? entry.authors.map((author) => author.data.name).join(", ")
    : undefined;
}

/**
 * The same names, each pointing at the author's own page. Kept apart from the
 * joined line because a byline set in one string cannot be split back into
 * links without depending on how it was joined, and a name containing a comma
 * would be split in two.
 */
export function bookAuthorLinks(entry: PresentableBook): AuthorLink[] {
  return entry.authors.map((author) => ({
    slug: author.id,
    name: author.data.name,
  }));
}

/**
 * What a search engine and a shared link are told the page is about. AKSC's
 * summary when there is one; otherwise the book itself, which is a plain fact
 * rather than an invented description.
 */
export function bookDescription(entry: PresentableBook): string {
  const { summary, title } = entry.book.data;

  if (summary) {
    return summary;
  }

  const byline = bookByline(entry);
  const named = byline ? `${title} by ${byline}` : title;

  return `${named}, on the Ambedkar King Study Circle's reading list.`;
}
