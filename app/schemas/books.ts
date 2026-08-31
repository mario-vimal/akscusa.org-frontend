/**
 * Books and the sessions that read them.
 *
 * The two are defined together because they are joined here: a reading names
 * the edition it worked through by ISBN, and that is the only link between
 * them. Keeping them apart would put the two halves of one relationship in two
 * files.
 */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { editorialTopicIds } from "~/features/editorial/taxonomy";
import {
  editorialBase,
  isbn13,
  linkSchema,
  optionalUrl,
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
    subtitle: z.string().optional(),
    authors: z.array(z.string()).min(1),
    /** Identifies the edition the circle read, and links readings to it. */
    isbn: isbn13,
    publisher: z.string().optional(),
    /** Year of this edition, which for a reprint is not the year written. */
    publishedYear: z
      .number()
      .int()
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    /** Year the text first appeared, kept for posthumous works. */
    firstPublishedYear: z
      .number()
      .int()
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    summary: z.string(),
    topics: z.array(z.enum(editorialTopicIds)).default([]),
    resources: z.array(linkSchema).default([]),
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
     * The book the session worked through, referenced by ISBN. Left unset for
     * a session built on a set of articles or papers rather than one book.
     */
    isbn: z
      .union([isbn13, z.literal("")])
      .optional()
      .transform((value) => value || undefined),
    participants: z.array(z.string()).default([]),
    registrationUrl: optionalUrl,
    /** Anything else read for the session, such as a linked PDF. */
    resources: z.array(linkSchema).default([]),
  }),
});
