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
//
// Sveltia writes an explicit YAML `null` for a scalar, object, or relation
// widget an editor leaves blank on a `required: false` field — not just a
// missing key — and for a plain text widget it sometimes writes `""` instead.
// Zod's `.optional()` only accepts `undefined`, so every optional field a
// Sveltia widget can produce needs to normalize its own empty shape here,
// once, rather than fail validation the next time an editor leaves it blank.
// This is what turned a valid `heroImage: null` into a build failure.
export function optionalCmsField<Schema extends z.ZodTypeAny>(schema: Schema) {
  return z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    schema.optional(),
  );
}

// A list/select widget an editor leaves empty is likewise sometimes written as
// `null` rather than an absent key or `[]`. `schema` here is expected to
// already carry its own `.default([])`, so a missing key keeps working exactly
// as before; this only extends that default to cover the explicit `null`.
export function optionalCmsList<Schema extends z.ZodTypeAny>(schema: Schema) {
  return z.preprocess((value) => (value === null ? [] : value), schema);
}

export const optionalUrl = optionalCmsField(z.url());

export const remoteImageSchema = z.object({
  src: z.url(),
  alt: z.string(),
});

// A hero image, portrait, or other optional image object is collapsed by
// Sveltia to `null` as a whole when an editor never opens the group, rather
// than sending an object with blank fields.
export const optionalRemoteImage = optionalCmsField(remoteImageSchema);

// Shared by every editorial-shaped collection that offers the multi-select
// topics widget, and by books and comics, which offer the same widget outside
// `editorialBase`.
export const topicsSchema = optionalCmsList(
  z.array(z.enum(editorialTopicIds)).default([]),
);

// Editorial records share one shape so the blog, press releases, interventions,
// and conferences can be listed, sorted, and cross-referenced by the same code.
// Each collection then adds only the fields its own kind of entry needs.
export const editorialBase = {
  title: z.string(),
  /** Publication date. For an intervention this is the date it started. */
  date: z.coerce.date(),
  /** One or two sentences used on index cards and as the meta description. */
  summary: z.string(),
  topics: topicsSchema,
  /**
   * Absolute URL of a hero image. Editorial media lives outside Git, so this
   * points at the media host rather than a repository path.
   */
  heroImage: optionalRemoteImage,
  /** Where this entry was first published, kept so migrated copy is traceable. */
  sourceUrl: optionalUrl,
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
};

export const linkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

// A poster or flyer, committed to Git rather than hosted on the media host:
// it is AKSC's own artwork, kept in its original colours, not editorial
// photography. Shared by every collection that offers the Sveltia `image`
// widget for posters, so the committed path and the shape a page reads are
// the same wherever a poster appears.
export function posterListSchema(collection: string) {
  return optionalCmsList(
    z
      .array(
        z.object({
          src: z
            .string()
            .regex(
              new RegExp(`^/media/${collection}/[a-z0-9-]+\\.jpg$`),
              `Must be a lowercase kebab-case JPG under /media/${collection}/.`,
            ),
          alt: z.string().min(1),
          caption: optionalCmsField(z.string()),
        }),
      )
      .default([]),
  );
}

// ISBN-13 identifies the edition a book entry names, so it is normalized and
// checked here rather than trusted. An invalid ISBN fails the build. It is
// bibliographic metadata rather than a relationship key: a reading names its
// book by the book entry's stable id, not by this field.
export const isbn13 = z
  .string()
  .transform(normalizeIsbn)
  .refine(
    isValidIsbn13,
    "Must be a valid ISBN-13, with a correct check digit.",
  );
