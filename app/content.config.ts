import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { isValidIsbn13, normalizeIsbn } from "./features/books/isbn";
import {
  articleCategoryIds,
  conferenceFormatIds,
  editorialTopicIds,
  generalBodyPaperKindIds,
  interventionKindIds,
  interventionStatusIds,
  programKindIds,
  programStatusIds,
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
  sourceUrl: z.url(),
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
  sourceUrl: z.url(),
});

// The constitution and membership pages are stable organization documents.
// Their copy stays in Markdown while the shared layout owns navigation and
// the membership page's handoff to the existing application form.
const constitutionPageSchema = z.object({
  pageType: z.literal("constitution"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  sourceUrl: z.url(),
});

const membershipPageSchema = z.object({
  pageType: z.literal("membership"),
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  intro: z.string(),
  sourceUrl: z.url(),
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
  sourceUrl: z.url(),
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
  sourceUrl: z.url(),
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
    contactPageSchema,
    donatePageSchema,
    organizationPageSchema,
    constitutionPageSchema,
    membershipPageSchema,
    generalBodyPageSchema,
    comicsPageSchema,
    antiCasteToolkitPageSchema,
  ]),
});

// Structured records edited through the CMS, unlike the static copy above.
// The CMS writes an empty string for an optional field left blank, so optional
// URLs accept one and normalize it away rather than failing validation.
const optionalUrl = z
  .union([z.url(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

const remoteImageSchema = z.object({
  src: z.url(),
  alt: z.string(),
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
  heroImage: remoteImageSchema.optional(),
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
const speakers = defineCollection({
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
const programs = defineCollection({
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

// A General Body meeting, not a loose file. The meeting is the entity: it has
// an edition, a date, and a place, and it publishes one or more papers. The 1st
// meeting submitted a report and adopted resolutions, which a flat list of
// documents could not express as one event.
//
// This mirrors `conferences`, the other annual gathering, so both are read the
// same way. It is not an editorial collection: a meeting has no summary, hero
// image, or body copy, and never appears in a dated editorial index.
const generalBodyMeetings = defineCollection({
  loader: glob({
    base: "./cms/content/general-body-meetings",
    pattern: "**/*.md",
  }),
  schema: z.object({
    /** Which General Body meeting this is, counting from the first in 2017. */
    edition: z.number().int().positive(),
    date: z.coerce.date(),
    /**
     * The 4th meeting is recorded by its successor as having been held in
     * October 2020, with no day named. Recording the precision keeps the page
     * from printing a day the record never claimed.
     */
    datePrecision: z.enum(["day", "month"]).default("day"),
    /** Where it was held, or that it was held online. */
    location: z.string(),
    papers: z
      .array(
        z.object({
          kind: z.enum(generalBodyPaperKindIds),
          /**
           * Site-relative path to the PDF, committed under
           * `cms/public/media/general-body/` and served from `/media/`, so the
           * papers survive the retirement of the old WordPress host.
           */
          file: z
            .string()
            .regex(
              /^\/media\/general-body\/[a-z0-9-]+\.pdf$/,
              "Must be a lowercase kebab-case PDF under /media/general-body/.",
            ),
          /** Printed beside the link, so the size of the download is known. */
          pageCount: z.number().int().positive().optional(),
        }),
      )
      .min(1),
    sourceUrl: optionalUrl,
    draft: z.boolean().default(false),
  }),
});

// Drawn work: a comic and a toolkit scenario are both a titled sequence of
// panels, so they share one panel shape.
//
// `alt` describes the drawing and `transcript` carries the lettering, and they
// are kept apart on purpose. A comic bakes its words into the image, so with no
// transcript the argument is invisible to a screen reader, to translation, and
// to search; and repeating the words in `alt` would have them read out twice.
//
// Panels are committed under `cms/public/media/`, which is the Astro public
// directory, so a published panel is a file this site serves rather than a link
// to somebody else's host.
const panelSchema = (mediaFolder: string) =>
  z.object({
    src: z
      .string()
      .regex(
        new RegExp(`^/media/${mediaFolder}/[a-z0-9-]+\\.(png|jpe?g|webp)$`),
        `Must be a lowercase kebab-case image under /media/${mediaFolder}/.`,
      ),
    /** Describes the drawing. The words in the panel go in `transcript`. */
    alt: z.string().min(1),
    /** Every word drawn inside the panel, in reading order. */
    transcript: z.string().optional(),
  });

// Artwork is credited, never anonymous. A comic drawn by somebody else is the
// point of the collection, so attribution is required rather than optional.
const creditSchema = z.object({
  name: z.string(),
  /** For example "Art", "Script", or "Art and script". */
  role: z.string().optional(),
  url: optionalUrl,
});

// Comics are a repeating record: each is a titled sequence of panels, AKSC and
// the artists it works with publish more of them over time, and an artist
// should be able to publish one without a developer. The invitation to submit
// artwork is one-off copy and stays in app/content.
const comics = defineCollection({
  loader: glob({
    base: "./cms/content/comics",
    pattern: "**/*.md",
  }),
  schema: z.object({
    title: z.string(),
    /** When the comic was published, used to order the index. */
    date: z.coerce.date(),
    summary: z.string(),
    topics: z.array(z.enum(editorialTopicIds)).default([]),
    credits: z.array(creditSchema).min(1),
    /** Warns a reader ahead of a comic that depicts violence or a slur. */
    contentNote: z.string().optional(),
    /**
     * In reading order. The first panel is the title panel, so it is also the
     * cover shown on the index; a comic never needs a separate hero image.
     */
    panels: z.array(panelSchema("comics")).min(1),
    sourceUrl: optionalUrl,
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

// A scenario in the anti-caste toolkit: a short illustrated situation that ends
// in a question to the reader. Three were drawn to start the playbook and more
// arrive as people send in what they wish they had said, so they are records
// rather than page copy.
//
// They are ordered by hand rather than by date, because a playbook is read in
// the sequence its authors chose.
const toolkitScenarios = defineCollection({
  loader: glob({
    base: "./cms/content/toolkit-scenarios",
    pattern: "**/*.md",
  }),
  schema: z.object({
    title: z.string(),
    /** Position in the playbook, counting from 1. */
    order: z.number().int().positive(),
    /** Where it happens, printed as the scene-setting line above the panels. */
    setting: z.string(),
    summary: z.string(),
    /** The question put to the reader once they have read the scenario. */
    prompt: z.string(),
    panels: z.array(panelSchema("anti-caste-toolkit")).min(1),
    credits: z.array(creditSchema).default([]),
    sourceUrl: optionalUrl,
    draft: z.boolean().default(false),
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
  speakers,
  programs,
  generalBodyMeetings,
  comics,
  toolkitScenarios,
};
