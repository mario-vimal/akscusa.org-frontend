/**
 * Books, the people who wrote them, and the sessions that read them.
 *
 * The three are defined together because they are joined here: a reading names
 * the book it worked through by the book's stable content-entry id (its
 * slug), a book names its authors the same way, and those ids are the only
 * links between them. An id survives an editor correcting the book's ISBN or
 * an author's display name, which neither of those fields can. Keeping them
 * apart would put the halves of one relationship in three files.
 */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import {
  cmsEntryId,
  cmsSlug,
  editorialBase,
  linkSchema,
  localImageSchema,
  mediaImagePath,
  optionalCmsField,
  optionalCmsList,
  optionalIsbn13,
  optionalUrl,
  posterListSchema,
  readingDate,
  slugReferences,
  topicsSchema,
} from "~/schemas/shared";

// An author is their own record because the relation runs both ways: one book
// names several authors, and one author carries several books. Stored as a
// string on a book, an author could not survive a catalogue returning two
// spellings of one name, and there would be nothing to hang a biography, a
// portrait, or a page on. The slug is the entry's filename, as it is for
// speakers, so renaming an author's display name never moves their page.
export const authors = defineCollection({
  loader: glob({
    base: "./cms/content/authors",
    pattern: "**/*.md",
    generateId: cmsEntryId,
  }),
  schema: z.object({
    /** The name as a byline prints it: "bell hooks", "B. R. Ambedkar". */
    name: z.string().min(1),
    /**
     * Other spellings for the same person — "Kancha Ilaiah" and "Kancha
     * Ilaiah Shepherd" are one author with two names in print.
     */
    aliases: optionalCmsList(z.array(z.string().min(1)).default([])),
    /** Paragraphs are separated by blank lines, as they are for a speaker. */
    bio: optionalCmsField(z.string()),
    /**
     * The portrait an author's page opens with, uploaded through the CMS and
     * committed beside this entry's index.md.
     *
     * `credit` carries what a borrowed photograph obliges us to say: who made
     * it, where it came from, and on what terms. It is optional because a
     * photograph AKSC owns has nobody to credit, and it is here rather than in
     * code because a licence is a fact about the picture an editor chose, not
     * a fact about the site. Without it there would be no way to publish a
     * CC BY-SA portrait without hard-coding its attribution.
     */
    portrait: optionalCmsField(
      localImageSchema("authors").extend({
        credit: optionalCmsField(
          z.object({
            creator: z.string().min(1),
            /** Where the picture came from, which is where its licence is stated. */
            sourceUrl: z.url(),
            license: z.string().min(1),
            /** Absent for public domain, which has no licence deed to link. */
            licenseUrl: optionalUrl,
            /** What was done to it, such as "cropped". */
            note: optionalCmsField(z.string()),
          }),
        ),
      }),
    ),
    sourceUrl: optionalUrl,
    draft: z.boolean().default(false),
  }),
});

// Books are their own records because one book carries several readings. They
// are not editorial entries: a book has no publication date of its own on this
// site and never appears in a dated index.
export const books = defineCollection({
  loader: glob({
    base: "./cms/content/books",
    pattern: "**/*.md",
    generateId: cmsEntryId,
  }),
  schema: z.object({
    /**
     * A book must name itself so it never renders an empty card or heading.
     */
    title: z.string().min(1),
    subtitle: optionalCmsField(z.string()),
    /**
     * Stable slugs of the authors' entries, not names typed into a book.
     */
    authors: slugReferences(
      "author",
      "A book cannot list the same author twice.",
    ),
    /**
     * Identifies the edition the circle read, when we know it. Optional
     * because a book is identified by its slug, not by an ISBN: the circle
     * reads pamphlets, PDFs of out-of-print texts, and editions predating the
     * scheme, and requiring an ISBN would mean either leaving those out of the
     * catalogue or inventing a number for them. Correcting it does not affect
     * a reading's link to this book, which is by this entry's stable id.
     */
    isbn: optionalIsbn13,
    /**
     * Cover art an editor uploaded beside this entry's index.md and served as
     * uploaded. A book without one simply renders no cover.
     */
    cover: optionalCmsField(mediaImagePath("books")),
    /**
     * Where the cover file came from, printed under the picture. It is content
     * rather than a rule in code because the source is a fact about the file
     * an editor chose: the covers here were taken from Open Library, and the
     * next one may not be. A book whose cover AKSC photographed itself has
     * nothing to name and prints the generic caption instead.
     */
    coverSource: optionalCmsField(linkSchema),
    publisher: optionalCmsField(z.string()),
    /** Year of this edition, which for a reprint is not the year written. */
    publishedYear: optionalCmsField(z.number().int()),
    /** Year the text first appeared, kept for posthumous works. */
    firstPublishedYear: optionalCmsField(z.number().int()),
    /**
     * AKSC's own sentence or two. A catalogue summary is the publisher's
     * marketing copy, so it is not imported into this field.
     */
    summary: optionalCmsField(z.string()),
    topics: topicsSchema,
    resources: optionalCmsList(z.array(linkSchema).default([])),
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
    generateId: cmsEntryId,
  }),
  schema: z.object({
    ...editorialBase,
    date: readingDate,
    /** Where the session met, or how to join it when it is held online. */
    location: z.string(),
    /**
     * The stable content-entry id (slug) of the book the session worked
     * through. Left unset for a session built on a set of articles or papers
     * rather than one book. Referencing the id rather than the ISBN means
     * correcting a book's ISBN cannot break this link.
     */
    book: optionalCmsField(cmsSlug),
    participants: optionalCmsList(z.array(z.string()).default([])),
    registrationUrl: optionalUrl,
    /** Anything else read for the session, such as a linked PDF. */
    resources: optionalCmsList(z.array(linkSchema).default([])),
    /**
     * AKSC's own flyers announcing the session, committed beside the entry in
     * their original colours. Left empty for a session no flyer survives for,
     * which shows no image rather than a broken one.
     */
    posters: posterListSchema("book-readings"),
  }),
});
