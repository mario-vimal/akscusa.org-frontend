import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

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

const pages = defineCollection({
  loader: glob({
    base: "./app/content/pages",
    pattern: "**/*.md",
  }),
  schema: z.discriminatedUnion("pageType", [
    homePageSchema,
    helplinePageSchema,
    testimoniesPageSchema,
  ]),
});

// Structured records edited through the CMS, unlike the static copy above.
// The CMS writes an empty string for an optional field left blank, so optional
// URLs accept one and normalize it away rather than failing validation.
const optionalUrl = z
  .union([z.url(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

const bookReadings = defineCollection({
  loader: glob({
    base: "./cms/content/book-readings",
    pattern: "**/*.md",
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    location: z.string(),
    book: z.object({
      title: z.string(),
      author: z.string(),
    }),
    participants: z.array(z.string()).default([]),
    registrationUrl: optionalUrl,
    summary: z.string(),
  }),
});

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
  bookReadings,
  articles,
  pressReleases,
  interventions,
  conferences,
};
