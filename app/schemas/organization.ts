/** The General Body: the meetings AKSC holds and the papers they publish. */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { generalBodyPaperKindIds } from "~/features/editorial/taxonomy";
import {
  cmsEntryId,
  mediaFilePath,
  optionalCmsField,
  optionalUrl,
} from "~/schemas/shared";

export const generalBodyPdfPath = mediaFilePath("general-body-meetings", [
  "pdf",
]);

// A General Body meeting, not a loose file. The meeting is the entity: it has
// an edition, a date, and a place, and it publishes one or more papers. The 1st
// meeting submitted a report and adopted resolutions, which a flat list of
// documents could not express as one event.
//
// This mirrors `conferences`, the other annual gathering, so both are read the
// same way. It is not an editorial collection: a meeting has no summary, hero
// image, or body copy, and never appears in a dated editorial index.
export const generalBodyMeetings = defineCollection({
  loader: glob({
    base: "./cms/content/general-body-meetings",
    pattern: "**/*.md",
    generateId: cmsEntryId,
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
           * New PDFs are uploaded beside this meeting's index.md. Shared
           * internal-library files can also be reused; every paper is served
           * directly from this site's /media/ URLs.
           */
          file: generalBodyPdfPath,
          /** Printed beside the link, so the size of the download is known. */
          pageCount: optionalCmsField(z.number().int().positive()),
        }),
      )
      .min(1),
    sourceUrl: optionalUrl,
    draft: z.boolean().default(false),
  }),
});
