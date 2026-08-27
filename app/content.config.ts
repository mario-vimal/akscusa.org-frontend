import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { isValidIsbn13, normalizeIsbn } from "./features/books/isbn";
import {
  articleCategoryIds,
  conferenceFormatIds,
  editorialTopicIds,
  interventionKindIds,
  interventionStatusIds,
} from "./features/editorial/taxonomy";

const actionSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const homePageSchema = z.object({
  pageType: z.literal("home"),
  title: z.string(),
  description: z.string(),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    imageAlt: z.string(),
    primaryAction: actionSchema,
    secondaryAction: actionSchema,
  }),
  statements: z.array(z.string()).min(1),
  quotes: z
    .array(
      z.object({
        text: z.string(),
        author: z.string(),
      }),
    )
    .min(1),
  closing: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    primaryAction: actionSchema,
    secondaryAction: actionSchema,
  }),
});

const helplinePageSchema = z.object({
  pageType: z.literal("helpline"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  emergencyDanger: z.string(),
  emergencyCrisis: z.string(),
  supportQuestions: z.array(z.string()).min(1),
  phone: z.object({
    display: z.string(),
    href: z.string(),
  }),
  email: z.email(),
  contactNote: z.string(),
  bannerAlt: z.string(),
  flyerAlt: z.string(),
  flyerCaption: z.string(),
});

const testimoniesPageSchema = z.object({
  pageType: z.literal("testimonies"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  contentNote: z.string(),
  categories: z
    .array(
      z.object({
        label: z.string(),
        id: z.string(),
      }),
    )
    .min(1),
  shareUrl: z.url(),
  solidarityUrl: z.url(),
});

// The book readings index takes its heading and description from
// `editorialSections`, like the other editorial indexes. Only the standing
// arrangement and the reading strands live here, because they are one-off copy
// that organisers change without a developer.
const bookReadingsPageSchema = z.object({
  pageType: z.literal("book-readings"),
  practicalitiesHeading: z.string(),
  practicalities: z
    .array(
      z.object({
        term: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
  strandsHeading: z.string(),
  strands: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        note: z.string().optional(),
      }),
    )
    .min(1),
});

const pages = defineCollection({
  loader: glob({
    base: "./app/content/pages",
    pattern: "**/*.md",
  }),
  schema: z.discriminatedUnion("pageType", [
    homePageSchema,
    helplinePageSchema,
    testimoniesPageSchema,
    bookReadingsPageSchema,
  ]),
});

// Structured records edited through the CMS, unlike the static copy above.
// The CMS writes an empty string for an optional field left blank, so optional
// URLs accept one and normalize it away rather than failing validation.
const optionalUrl = z
  .union([z.url(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

// Editorial records share one shape so the blog, press releases, interventions,
// and conferences can be listed, sorted, and cross-referenced by the same code.
// Each collection then adds only the fields its own kind of entry needs.
const editorialBase = {
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
  heroImage: z
    .object({
      src: z.url(),
      alt: z.string(),
    })
    .optional(),
  /** Where this entry was first published, kept so migrated copy is traceable. */
  sourceUrl: optionalUrl,
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
};

const linkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

// ISBN-13 is the join key between a reading and a book, so it is normalized
// and checked here rather than trusted. An invalid ISBN fails the build.
const isbn13 = z
  .string()
  .transform(normalizeIsbn)
  .refine(
    isValidIsbn13,
    "Must be a valid ISBN-13, with a correct check digit.",
  );

// Books are their own records because one book carries several readings. They
// are not editorial entries: a book has no publication date of its own on this
// site and never appears in a dated index.
const books = defineCollection({
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
    publishedYear: z.number().int().optional(),
    /** Year the text first appeared, kept for posthumous works. */
    firstPublishedYear: z.number().int().optional(),
    summary: z.string(),
    topics: z.array(z.enum(editorialTopicIds)).default([]),
    resources: z.array(linkSchema).default([]),
    draft: z.boolean().default(false),
  }),
});

// A reading session is a repeating record: sessions share one shape, new ones
// are scheduled regularly, and organisers add them without a developer. The
// standing arrangement around them is one-off copy and stays in app/content.
const bookReadings = defineCollection({
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

const articles = defineCollection({
  loader: glob({
    base: "./cms/content/articles",
    pattern: "**/*.md",
  }),
  schema: z.object({
    ...editorialBase,
    category: z.enum(articleCategoryIds),
    authors: z
      .array(
        z.object({
          name: z.string(),
          role: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

const pressReleases = defineCollection({
  loader: glob({
    base: "./cms/content/press-releases",
    pattern: "**/*.md",
  }),
  schema: z.object({
    ...editorialBase,
    /** Place of issue, printed ahead of the date in the classic release style. */
    dateline: z.string().optional(),
    /** Every organisation the release is issued in the name of. */
    issuedBy: z.array(z.string()).min(1),
    contactEmail: z
      .union([z.email(), z.literal("")])
      .optional()
      .transform((value) => value || undefined),
    attachments: z.array(linkSchema).default([]),
  }),
});

const interventions = defineCollection({
  loader: glob({
    base: "./cms/content/interventions",
    pattern: "**/*.md",
  }),
  schema: z.object({
    ...editorialBase,
    kind: z.enum(interventionKindIds),
    status: z.enum(interventionStatusIds),
    /** Set once the work is over, so a concluded entry can show a date range. */
    concludedDate: z.coerce.date().optional(),
    /** What the intervention achieved, shown on concluded entries. */
    outcome: z.string().optional(),
    resources: z.array(linkSchema).default([]),
  }),
});

const conferences = defineCollection({
  loader: glob({
    base: "./cms/content/conferences",
    pattern: "**/*.md",
  }),
  schema: z.object({
    ...editorialBase,
    /** Which annual conference this is, counting from the first in 2018. */
    edition: z.number().int().positive().optional(),
    /** Set only for a conference that runs over more than one day. */
    endDate: z.coerce.date().optional(),
    location: z.string().optional(),
    format: z.enum(conferenceFormatIds),
    theme: z.string().optional(),
    registrationUrl: optionalUrl,
    resources: z.array(linkSchema).default([]),
  }),
});

export const collections = {
  pages,
  books,
  bookReadings,
  articles,
  pressReleases,
  interventions,
  conferences,
};
