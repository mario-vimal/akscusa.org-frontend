/**
 * One-off page copy, maintained in Git rather than through the CMS.
 *
 * Each page has its own shape and they are told apart by `pageType`, so a
 * missing field on any of them fails the build with the page named.
 */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { optionalUrl } from "./shared";

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
    primaryAction: actionSchema,
    secondaryAction: actionSchema,
  }),
  quotes: z
    .array(
      z.object({
        text: z.string(),
        author: z.string(),
        source: z.string(),
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

// The contact page routes an enquiry to the right channel. The channels are
// one-off copy rather than a collection: there are a handful, they change only
// when the organisation changes how it can be reached, and the social accounts
// already live in `app/config/social.ts` so they are not repeated here.
const contactPageSchema = z.object({
  pageType: z.literal("contact"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  channels: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        actionLabel: z.string(),
        actionHref: z.string(),
        /** A qualification the reader needs before choosing this channel. */
        note: z.string().optional(),
      }),
    )
    .min(1),
  socialHeading: z.string(),
  socialIntro: z.string(),
});

// Donation copy is one stable page. The payment provider remains an external
// action until a first-party payment flow is designed separately.
const donatePageSchema = z.object({
  pageType: z.literal("donate"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  donationLabel: z.string(),
  donationUrl: z.url(),
  sourceUrl: optionalUrl,
});

// The organization overview is one stable page, not a stream of records. Its
// long-form argument and FAQ stay in Markdown while the component owns the
// page navigation and calls to action.
const organizationPageSchema = z.object({
  pageType: z.literal("organization"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  sourceUrl: optionalUrl,
});

// The constitution page is a stable organization document. Its copy stays in
// Markdown while the shared layout owns navigation.
const constitutionPageSchema = z.object({
  pageType: z.literal("constitution"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  sourceUrl: optionalUrl,
});

// Joining is the site's primary call to action, so it has a page of its own at
// the top level rather than a row inside the organization records. The copy is
// the migrated eligibility and dues text; the argument for membership lives on
// the organization page and is linked rather than repeated.
const joinPageSchema = z.object({
  pageType: z.literal("join"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  sourceUrl: optionalUrl,
  joinUrl: z.url(),
});

// The General Body index carries a standing argument about self-dignity ahead
// of the meetings, migrated from the WordPress documents page. That argument is
// one-off page copy, while the meetings below it are repeating records.
const generalBodyPageSchema = z.object({
  pageType: z.literal("general-body"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  meetingsHeading: z.string(),
  meetingsIntro: z.string(),
  /** Explains a visible gap in the sequence of meetings. */
  meetingsNote: z.string().optional(),
});

// The comics index frames the collection and invites other artists to add to
// it. That invitation is one-off copy: it changes when the way to contribute
// changes, not when a comic is published, so it is not a CMS field.
const comicsPageSchema = z.object({
  pageType: z.literal("comics"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  /**
   * The question the comics were drawn to answer, kept from the old page and
   * set as the page heading. The `title` above stays the short name the browser
   * tab and the search result carry.
   */
  headline: z.string(),
  intro: z.string(),
  contribute: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    /** What an artist is asked to send, and where. */
    steps: z.array(z.string()).min(1),
    primaryAction: actionSchema,
    secondaryAction: actionSchema.optional(),
    note: z.string().optional(),
  }),
  sourceUrl: optionalUrl,
});

// The toolkit is a playbook being written in public: the argument for it is
// static copy, the illustrated scenarios that carry it are a collection, and
// the form that gathers responses is the point of the page.
const antiCasteToolkitPageSchema = z.object({
  pageType: z.literal("anti-caste-toolkit"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  /** The playbook's own subtitle, set under the heading. */
  tagline: z.string(),
  /** The sentence that names the freeze response, set above the argument. */
  lede: z.string(),
  scenariosHeading: z.string(),
  scenariosIntro: z.string(),
  /** Labelled link to the Google Form that gathers responses. */
  form: actionSchema,
  contribute: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
  }),
  sourceUrl: optionalUrl,
});

const gamePhotoSchema = z.object({
  file: z.string().regex(/^[a-z0-9-]+\.jpg$/),
  alt: z.string().min(1),
  credit: z.object({
    name: z.string().min(1),
    profile: z.url(),
    source: z.url(),
  }),
});

const gameQuestionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  prompt: z.string().min(1),
  quotes: z.array(z.string().min(1)).default([]),
  choices: z
    .tuple([z.string().min(1), z.string().min(1)])
    .refine(([first, second]) => first !== second, "Choices must differ."),
  answer: z.enum(["first", "second", "both"]),
  explanation: z.array(z.string().min(1)).min(1),
  photo: gamePhotoSchema,
  references: z
    .array(
      z.object({
        before: z.string().optional(),
        label: z.string().min(1),
        href: z.url(),
        after: z.string().optional(),
      }),
    )
    .default([]),
});

// This is the fixed September 2023 game, not a growing collection. Its five
// questions, explanations and answer key remain together in one static page.
export const whoSaidWhatPageSchema = z.object({
  pageType: z.literal("who-said-what"),
  title: z.string().min(1),
  description: z.string().min(1),
  eyebrow: z.string().min(1),
  lede: z.string().min(1),
  publishedAt: z.coerce.date(),
  archiveNote: z.string().min(1),
  gameHeading: z.string().min(1),
  instructions: z.string().min(1),
  noScriptInstructions: z.string().min(1),
  contentNote: z.string().min(1),
  photo: gamePhotoSchema,
  questions: z
    .array(gameQuestionSchema)
    .length(5)
    .refine(
      (questions) =>
        new Set(questions.map((question) => question.id)).size ===
        questions.length,
      "Question identifiers must be unique.",
    ),
});

export type WhoSaidWhatPageCopy = z.infer<typeof whoSaidWhatPageSchema>;

export const pages = defineCollection({
  loader: glob({
    base: "./app/content/pages",
    pattern: "**/*.md",
  }),
  schema: z.discriminatedUnion("pageType", [
    homePageSchema,
    helplinePageSchema,
    testimoniesPageSchema,
    bookReadingsPageSchema,
    contactPageSchema,
    donatePageSchema,
    organizationPageSchema,
    constitutionPageSchema,
    joinPageSchema,
    generalBodyPageSchema,
    comicsPageSchema,
    antiCasteToolkitPageSchema,
    whoSaidWhatPageSchema,
  ]),
});
