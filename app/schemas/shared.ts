/**
 * Schema fragments used by more than one collection.
 *
 * A field defined here is one an editor meets in several forms and one this
 * site reads with the same code wherever it appears. Anything used by a single
 * collection stays with that collection instead.
 */

import { z } from "astro/zod";

import { isValidIsbn13, normalizeIsbn } from "~/features/books/isbn";
import { editorialTopicIds } from "~/features/editorial/taxonomy";

// Structured records edited through the CMS, unlike the static copy above.
// The CMS writes an empty string for an optional field left blank, so optional
// URLs accept one and normalize it away rather than failing validation.
export const optionalUrl = z
  .union([z.url(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

export const remoteImageSchema = z.object({
  src: z.url(),
  alt: z.string(),
});

// Editorial records share one shape so the blog, press releases, interventions,
// and conferences can be listed, sorted, and cross-referenced by the same code.
// Each collection then adds only the fields its own kind of entry needs.
export const editorialBase = {
  title: z.string(),
  /** Publication date. For an intervention this is the date it started. */
  date: z.coerce.date(),
  /** One or two sentences used on index cards and as the meta description. */
  summary: z.string(),
  topics: z.array(z.enum(editorialTopicIds)).default([]),
  /**
   * Absolute URL of a hero image. Editorial media lives outside Git, so this
   * points at the media host rather than a repository path.
   */
  heroImage: remoteImageSchema.optional(),
  /** Where this entry was first published, kept so migrated copy is traceable. */
  sourceUrl: optionalUrl,
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
};

export const linkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

// ISBN-13 is the join key between a reading and a book, so it is normalized
// and checked here rather than trusted. An invalid ISBN fails the build.
export const isbn13 = z
  .string()
  .transform(normalizeIsbn)
  .refine(
    isValidIsbn13,
    "Must be a valid ISBN-13, with a correct check digit.",
  );
