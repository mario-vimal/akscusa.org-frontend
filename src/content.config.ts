import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

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
    base: "./src/content/pages",
    pattern: "**/*.md",
  }),
  schema: z.discriminatedUnion("pageType", [
    homePageSchema,
    helplinePageSchema,
    testimoniesPageSchema,
  ]),
});

export const collections = { pages };
