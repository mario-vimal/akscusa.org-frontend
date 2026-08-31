/** Drawn work: comics, and the scenes that make up the anti-caste toolkit. */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import {
  optionalCmsField,
  optionalCmsList,
  optionalUrl,
  topicsSchema,
} from "~/schemas/shared";

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
    transcript: optionalCmsField(z.string()),
  });

// Artwork is credited, never anonymous. A comic drawn by somebody else is the
// point of the collection, so attribution is required rather than optional.
const creditSchema = z.object({
  name: z.string(),
  /** For example "Art", "Script", or "Art and script". */
  role: optionalCmsField(z.string()),
  url: optionalUrl,
});

// Comics are a repeating record: each is a titled sequence of panels, AKSC and
// the artists it works with publish more of them over time, and an artist
// should be able to publish one without a developer. The invitation to submit
// artwork is one-off copy and stays in app/content.
export const comics = defineCollection({
  loader: glob({
    base: "./cms/content/comics",
    pattern: "**/*.md",
  }),
  schema: z.object({
    title: z.string(),
    /** When the comic was published, used to order the index. */
    date: z.coerce.date(),
    summary: z.string(),
    topics: topicsSchema,
    credits: z.array(creditSchema).min(1),
    /** Warns a reader ahead of a comic that depicts violence or a slur. */
    contentNote: optionalCmsField(z.string()),
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
export const toolkitScenarios = defineCollection({
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
    credits: optionalCmsList(z.array(creditSchema).default([])),
    sourceUrl: optionalUrl,
    draft: z.boolean().default(false),
  }),
});
