/**
 * The vocabularies an editor maintains: the topics every collection can be
 * filed under, and the categories the blog is shelved by.
 *
 * These were a fixed list in `app/features/editorial/taxonomy.ts` and a
 * matching set of `select` options in the CMS, so naming a new subject took a
 * developer, a pull request, and a deploy. A vocabulary is editorial judgement
 * about what the site writes on, not a rule the code depends on, so it is
 * content: an editor adds a term here and it is immediately offered by every
 * form that files an entry under one.
 *
 * The structural vocabularies stay in code. An intervention's status or a
 * program's kind decides what the templates do — whether a date range prints,
 * which index an entry falls into — so a term invented for one of those would
 * have no behaviour behind it.
 *
 * A term's filename is its stable id and is what entries store, so renaming
 * the label an editor sees never rewrites every entry that carries it.
 */

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { optionalCmsField } from "~/schemas/shared";

const term = z.object({
  /** The name as the site prints it on a chip, a filter, or a heading. */
  label: z.string().min(1),
  /**
   * What belongs under the term. It is what a category index prints under its
   * heading, and it is the note that stops two editors filing the same work
   * under two terms.
   */
  description: optionalCmsField(z.string()),
});

const termCollection = (folder: string) =>
  defineCollection({
    loader: glob({ base: `./cms/content/${folder}`, pattern: "**/*.md" }),
    schema: term,
  });

export const topics = termCollection("topics");
export const categories = termCollection("categories");
