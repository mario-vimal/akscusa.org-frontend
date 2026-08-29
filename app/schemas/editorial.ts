/**
 * The dated sections: writing, statements, campaigns, gatherings, and programs,
 * plus the speaker biographies a conference references.
 *
 * They share `editorialBase`, so one change to the shared shape reaches all of
 * them and they can be listed and linked by the same code.
 */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import {
  articleCategoryIds,
  conferenceFormatIds,
  interventionKindIds,
  interventionStatusIds,
  programKindIds,
  programStatusIds,
} from "~/features/editorial/taxonomy";
import {
  editorialBase,
  linkSchema,
  optionalUrl,
  remoteImageSchema,
} from "~/schemas/shared";

export const articles = defineCollection({
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

export const pressReleases = defineCollection({
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

export const interventions = defineCollection({
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

export const conferences = defineCollection({
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
    speakers: z
      .array(
        z
          .string()
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Must be a lowercase kebab-case speaker slug.",
          ),
      )
      .default([])
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "A conference cannot list the same speaker twice.",
      ),
    resources: z.array(linkSchema).default([]),
  }),
});

// A speaker may appear at several conferences, so biographies are stored once
// and conferences reference them by stable slug. They have no standalone route:
// the conference remains the context in which a biography is presented.
export const speakers = defineCollection({
  loader: glob({
    base: "./cms/content/speakers",
    pattern: "**/*.md",
  }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    /** Paragraphs are separated by blank lines in the CMS text field. */
    bio: z.string(),
    portrait: remoteImageSchema.optional(),
    sourceUrl: optionalUrl,
    draft: z.boolean().default(false),
  }),
});

// Programs are repeating public events and initiatives. New programs are
// announced over time and organisers need to publish them without a developer,
// so they belong in the CMS rather than in one-off page copy.
export const programs = defineCollection({
  loader: glob({
    base: "./cms/content/programs",
    pattern: "**/*.md",
  }),
  schema: z.object({
    ...editorialBase,
    kind: z.enum(programKindIds),
    status: z.enum(programStatusIds),
    /** Time or range as published, retained separately from the calendar day. */
    schedule: z.string().optional(),
    location: z.string().optional(),
    registrationUrl: optionalUrl,
    posters: z
      .array(
        z.object({
          src: z
            .string()
            .regex(
              /^\/media\/programs\/[a-z0-9-]+\.jpg$/,
              "Must be a lowercase kebab-case JPG under /media/programs/.",
            ),
          alt: z.string().min(1),
          caption: z.string().optional(),
        }),
      )
      .default([]),
    resources: z.array(linkSchema).default([]),
  }),
});
