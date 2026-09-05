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

const webUrl = z.url({ protocol: /^https?$/ });

// Sveltia's ASCII slugger keeps underscores and tildes. Astro's default
// Markdown slugger does not keep all the same characters. Media-owning entries
// use <slug>/index.md, while vocabularies use <slug>.md; neither ID should pass
// through a second slugger.
export const cmsSlug = z
  .string()
  .regex(
    /^[a-z0-9_~-]+$/,
    "Use a lowercase ASCII filename with letters, numbers, hyphens, underscores or tildes.",
  );

export function cmsEntryId({ entry }: { entry: string }): string {
  return cmsSlug.parse(entry.replace(/(?:\/index)?\.md$/, ""));
}

// Uploads live beside their entry's index.md and are served at
// /media/<collection>/<slug>/<filename>. The global picker offers genuinely
// shared files at /media/shared/. These are the namespaces the media resolver
// can actually serve; historical archive paths are not a storage contract.
export const mediaImageExtensions = ["png", "jpg", "jpeg", "webp"] as const;

export const mediaFilePath = (
  collection: string,
  extensions: readonly string[],
) =>
  z
    .string()
    .regex(
      new RegExp(
        `^/media/(?:shared/(?:[a-z0-9_~-]+/)*|[a-z0-9_~-]+/[a-z0-9_~-]+/)[a-z0-9_~-]+\\.(?:${extensions.join("|")})$`,
      ),
      `Use a normalized ${extensions.join("/")} file under /media/${collection}/<entry>/ or /media/shared/.`,
    );

export const mediaImagePath = (collection: string) =>
  mediaFilePath(collection, mediaImageExtensions);

export const editorialImageSchema = z.object({
  src: z.union([mediaImagePath("collection"), webUrl]),
  alt: z.string(),
});

// A reading is an authored instant, not a calendar-only record. Require its
// offset before coercion; otherwise the build timezone invents a time or day.
// Astro may supply Date objects, so raw YAML is also checked before coercion.
export const readingDate = z
  .union([z.iso.datetime({ offset: true }), z.date()])
  .pipe(z.coerce.date());

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
export const optionalEditorialImage = optionalCmsField(editorialImageSchema);

// Shared by every editorial-shaped collection that offers the topics widget,
// and by books and comics, which offer the same widget outside `editorialBase`.
//
// The values are ids of entries in the editor-maintained `topics` collection,
// not members of an enum: an editor adds a topic without a developer, so there
// is no fixed list here to check against. A typo cannot arrive through the
// CMS, because the relation widget only offers terms that exist, and
// `scripts/content/taxonomy.test.ts` catches one typed into a file by hand.
export const topicsSchema = optionalCmsList(z.array(cmsSlug).default([]));

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
   * A public /media/ path for an uploaded image, or a genuine external image
   * URL. Uploading through the CMS never requires a separate storage account.
   */
  heroImage: optionalEditorialImage,
  /** A genuine external publication or document, when one should be credited. */
  sourceUrl: optionalUrl,
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
};

const mediaResourcePath = mediaFilePath("collection", [
  ...mediaImageExtensions,
  "pdf",
]);

function isSafeLocalResource(value: string): boolean {
  if (/[\\\s\p{Cc}]/u.test(value)) return false;
  if (value.startsWith("#")) return value.length > 1;
  if (!value.startsWith("/") || value.startsWith("//")) return false;

  const pathname = value.split(/[?#]/, 1)[0];
  if (pathname === "/media" || pathname.startsWith("/media/")) {
    return mediaResourcePath.safeParse(pathname).success;
  }

  // Validate before URL() can normalize away traversal or encoded separators.
  try {
    return pathname.split("/").every((part) => {
      const decoded = decodeURIComponent(part);
      return (
        decoded !== "." && decoded !== ".." && !/[\\/%\s\p{Cc}]/u.test(decoded)
      );
    });
  } catch (error) {
    if (error instanceof URIError) return false;
    throw error;
  }
}

export const resourceUrl = z.union([
  webUrl,
  z.string().refine(isSafeLocalResource, {
    message:
      "Use a safe site-relative page or /media/ path, or an HTTP(S) URL.",
  }),
]);

export const linkSchema = z.object({
  label: z.string(),
  url: resourceUrl,
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
      .array(cmsSlug.describe(`Stable ${noun} filename.`))
      .default([])
      .refine((ids) => new Set(ids).size === ids.length, duplicateMessage),
  );
}

// A poster or flyer is AKSC's own artwork, kept in its original colours.
// Shared by every collection that offers the Sveltia `image`
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

// Sveltia trims strings before checking widget patterns, so whitespace-only
// optional ISBN input must be as empty here as it is in the editor.
export const optionalIsbn13 = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  optionalCmsField(isbn13),
);
