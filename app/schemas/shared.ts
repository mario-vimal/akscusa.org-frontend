/**
 * Schema fragments used by more than one collection.
 *
 * A field defined here is one an editor meets in several forms and one this
 * site reads with the same code wherever it appears. Anything used by a single
 * collection stays with that collection instead.
 */

import { z } from "astro/zod";

import { isValidIsbn13, normalizeIsbn } from "~/features/books/isbn";

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

// One rule for an image the CMS uploads and Astro serves unchanged out of
// `cms/public/`. A cover, a portrait, and a flyer are the same kind of thing —
// a committed file under `/media/<collection>/` — so they are checked in one
// place. Three copies of this regex is how they come to disagree about which
// extensions and filenames are allowed.
export const mediaImagePath = (collection: string) =>
  z
    .string()
    .regex(
      new RegExp(`^/media/${collection}/[a-z0-9-]+\\.(?:png|jpe?g|webp)$`),
      `Must be a lowercase kebab-case image under /media/${collection}/.`,
    );

// An uploaded image with its alternative text, for a portrait or any other
// single image an editor attaches rather than a list of them.
export const localImageSchema = (collection: string) =>
  z.object({
    src: mediaImagePath(collection),
    alt: z.string().min(1),
  });

// A hero image, portrait, or other optional image object is collapsed by
// Sveltia to `null` as a whole when an editor never opens the group, rather
// than sending an object with blank fields.
export const optionalRemoteImage = optionalCmsField(remoteImageSchema);

// Shared by every editorial-shaped collection that offers the topics widget,
// and by books and comics, which offer the same widget outside `editorialBase`.
//
// The values are ids of entries in the editor-maintained `topics` collection,
// not members of an enum: an editor adds a topic without a developer, so there
// is no fixed list here to check against. A typo cannot arrive through the
// CMS, because the relation widget only offers terms that exist, and
// `scripts/content/taxonomy.test.ts` catches one typed into a file by hand.
export const topicsSchema = optionalCmsList(
  z
    .array(
      z
        .string()
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Must be a lowercase kebab-case topic slug.",
        ),
    )
    .default([]),
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

// A relation to another collection, stored as that collection's stable entry
// ids. Shared because two collections now hold one: a conference names its
// speakers and a book names its authors, and both are a list of slugs an
// editor picks from a relation widget rather than a list of typed names.
//
// The shape is checked here; that a slug names an entry which exists and is
// published is checked where the reference is resolved, because a schema
// cannot read another collection. `noun` names what is being referenced so a
// rejected value says which field it came from.
export function slugReferences(noun: string, duplicateMessage: string) {
  return optionalCmsList(
    z
      .array(
        z
          .string()
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            `Must be a lowercase kebab-case ${noun} slug.`,
          ),
      )
      .default([])
      .refine((ids) => new Set(ids).size === ids.length, duplicateMessage),
  );
}

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
          src: mediaImagePath(collection),
          alt: z.string().min(1),
          caption: optionalCmsField(z.string()),
        }),
      )
      .default([]),
  );
}

// ISBN-13 identifies the edition a book entry names, so where one is given it
// is normalized and checked here rather than trusted. An invalid ISBN fails
// the build. It is bibliographic metadata rather than a relationship key, and
// it is optional for that reason: a reading names its book by the book entry's
// stable id, so a pamphlet with no ISBN is still a book the site can carry.
export const isbn13 = z
  .string()
  .transform(normalizeIsbn)
  .refine(
    isValidIsbn13,
    "Must be a valid ISBN-13, with a correct check digit.",
  );
