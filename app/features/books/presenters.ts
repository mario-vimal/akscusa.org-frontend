/**
 * The strings a page prints about a book.
 *
 * A book entry states its ISBN and lets the catalogue answer for the rest, so
 * everything except the title and the ISBN may be missing on the day it is
 * created. The two places that cannot simply print nothing — a byline and the
 * meta description of the book's own page — are built here, once, rather than
 * each component deciding for itself what an absent field looks like.
 *
 * Both take the fields they read rather than a `CollectionEntry`, so they can
 * be tested without `astro:content`, which only exists inside an Astro build.
 */

/** Enough of a book entry to build the strings a page prints about it. */
export interface PresentableBook {
  data: {
    title: string;
    authors: readonly string[];
    summary?: string;
  };
}

/** The authors on one line, or nothing when the entry names none. */
export function bookAuthors(book: PresentableBook): string | undefined {
  const { authors } = book.data;

  return authors.length > 0 ? authors.join(", ") : undefined;
}

/**
 * What a search engine and a shared link are told the page is about. AKSC's
 * summary when there is one; otherwise the book itself, which is a plain fact
 * rather than an invented description.
 */
export function bookDescription(book: PresentableBook): string {
  const { summary, title } = book.data;

  if (summary) {
    return summary;
  }

  const authors = bookAuthors(book);
  const named = authors ? `${title} by ${authors}` : title;

  return `${named}, on the Ambedkar King Study Circle's reading list.`;
}
