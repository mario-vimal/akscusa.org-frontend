/**
 * Where an author's page lives, and the smallest view of an author a component
 * needs to name one.
 *
 * A plain module rather than part of `queries/`, because it reads no content:
 * the slug is the author entry's id, so a link can be built anywhere the id is
 * known — including in the book presenters, which are tested outside an Astro
 * build where `astro:content` does not exist.
 */

/** An author as anything printing a byline needs them: a slug and a name. */
export interface AuthorLink {
  /** The author entry's id, which is also the last segment of their URL. */
  slug: string;
  name: string;
}

export const authorHref = (slug: string) => `/authors/${slug}/`;
