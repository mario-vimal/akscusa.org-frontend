/**
 * Books and the sessions that read them.
 *
 * The two are defined together because they are joined here: a reading names
 * the book it worked through by the book's stable content-entry id (its
 * slug), and that is the only link between them. The id survives an editor
 * correcting the book's ISBN, which the ISBN itself cannot. Keeping them
 * apart would put the two halves of one relationship in two files.
 */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import {
  editorialBase,
  isbn13,
  linkSchema,
  optionalCmsField,
  optionalCmsList,
  optionalUrl,
  topicsSchema,
} from "~/schemas/shared";

// Books are their own records because one book carries several readings. They
// are not editorial entries: a book has no publication date of its own on this
// site and never appears in a dated index.
export const books = defineCollection({
  loader: glob({
    base: "./cms/content/books",
    pattern: "**/*.md",
  }),
  schema: z.object({
    title: z.string(),
    subtitle: optionalCmsField(z.string()),
    authors: z.array(z.string()).min(1),
    /**
     * Identifies the edition the circle read, for bibliographic lookup and
     * cover naming. Correcting it does not affect a reading's link to this
     * book, which is by this entry's stable id instead.
     */
    isbn: isbn13,
    publisher: optionalCmsField(z.string()),
    /** Year of this edition, which for a reprint is not the year written. */
    publishedYear: optionalCmsField(z.number().int()),
    /** Year the text first appeared, kept for posthumous works. */
    firstPublishedYear: optionalCmsField(z.number().int()),
    summary: z.string(),
    topics: topicsSchema,
    resources: optionalCmsList(z.array(linkSchema).default([])),
    draft: z.boolean().default(false),
  }),
});

// A reading session is a repeating record: sessions share one shape, new ones
// are scheduled regularly, and organisers add them without a developer. The
// standing arrangement around them is one-off copy and stays in app/content.
export const bookReadings = defineCollection({
  loader: glob({
    base: "./cms/content/book-readings",
    pattern: "**/*.md",
  }),
  schema: z.object({
    ...editorialBase,
    /** Where the session met, or how to join it when it is held online. */
    location: z.string(),
    /**
     * The stable content-entry id (slug) of the book the session worked
     * through. Left unset for a session built on a set of articles or papers
     * rather than one book. Referencing the id rather than the ISBN means
     * correcting a book's ISBN cannot break this link.
     */
    book: optionalCmsField(z.string().min(1)),
    participants: optionalCmsList(z.array(z.string()).default([])),
    registrationUrl: optionalUrl,
    /** Anything else read for the session, such as a linked PDF. */
    resources: optionalCmsList(z.array(linkSchema).default([])),
  }),
});
