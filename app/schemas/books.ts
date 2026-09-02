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
  editorialBase,
  isbn13,
  linkSchema,
  optionalCmsField,
  optionalCmsList,
  optionalRemoteImage,
  optionalUrl,
  posterListSchema,
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
  }),
  schema: z.object({
    /** The name as a byline prints it: "bell hooks", "B. R. Ambedkar". */
    name: z.string().min(1),
    /**
     * Other spellings a catalogue returns for the same person — "Kancha
     * Ilaiah" and "Kancha Ilaiah Shepherd" are one author with two names in
     * print. `scripts/enrich-books.mjs` matches a fetched name against these
     * before creating an entry, which is what stops a second spelling minting
     * a second author and splitting their books across two pages.
     */
    aliases: optionalCmsList(z.array(z.string().min(1)).default([])),
    /** Paragraphs are separated by blank lines, as they are for a speaker. */
    bio: optionalCmsField(z.string()),
    portrait: optionalRemoteImage,
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
  }),
  schema: z.object({
    /**
     * A book must name itself: blank is rejected rather than defaulted,
     * because an untitled book would render an empty card and an empty
     * heading. An entry saved with no title has one written into it from its
     * ISBN before it is merged, so this fails only when the catalogue had no
     * record either — which is exactly when a person should look at it.
     */
    title: z.string().min(1),
    subtitle: optionalCmsField(z.string()),
    /**
     * The stable slugs of the authors' entries, not their names. Filled from
     * the ISBN when the entry does not state them — the enrichment script
     * matches each fetched name to an author entry, or creates one, so what
     * lands here is always a slug. A book with no authors is one Open Library
     * had nothing for. Pages print the byline only when there is one rather
     * than an empty line.
     */
    authors: slugReferences(
      "author",
      "A book cannot list the same author twice.",
    ),
    /**
     * Identifies the edition the circle read, for bibliographic lookup and
     * cover naming. Correcting it does not affect a reading's link to this
     * book, which is by this entry's stable id instead.
     */
    isbn: isbn13,
    publisher: optionalCmsField(z.string()),
    /** Year of this edition, which for a reprint is not the year written. */
    publishedYear: optionalCmsField(z.number().int()),
    /** Year the text first appeared, kept for posthumous works. */
    firstPublishedYear: optionalCmsField(z.number().int()),
    /**
     * AKSC's own sentence or two, the one thing about a book that cannot come
     * from its ISBN: a catalogue summary is the publisher's marketing copy.
     * Optional so an entry can be saved from the ISBN alone and written up
     * afterwards, rather than an editor filling the field with a blurb.
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
  }),
  schema: z.object({
    ...editorialBase,
    /** Where the session met, or how to join it when it is held online. */
    location: z.string(),
    /**
     * The stable content-entry id (slug) of the book the session worked
     * through. Left unset for a session built on a set of articles or papers
     * rather than one book. Referencing the id rather than the ISBN means
     * correcting a book's ISBN cannot break this link.
     */
    book: optionalCmsField(z.string().min(1)),
    participants: optionalCmsList(z.array(z.string()).default([])),
    registrationUrl: optionalUrl,
    /** Anything else read for the session, such as a linked PDF. */
    resources: optionalCmsList(z.array(linkSchema).default([])),
    /**
     * AKSC's own flyers announcing the session, committed to Git in their
     * original colours rather than hosted on the media host. Left empty for
     * a session no flyer survives for, which shows no image rather than a
     * broken one.
     */
    posters: posterListSchema("book-readings"),
  }),
});
