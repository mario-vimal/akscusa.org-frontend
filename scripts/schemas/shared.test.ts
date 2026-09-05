import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { z } from "astro/zod";

import {
  editorialBase,
  editorialImageSchema,
  isbn13,
  linkSchema,
  optionalCmsField,
  optionalCmsList,
  optionalEditorialImage,
  optionalUrl,
  readingDate,
  resourceUrl,
  topicsSchema,
} from "~/schemas/shared";

describe("reading instants", () => {
  it.each([
    "2026-09-19T15:00:00-07:00",
    "2026-09-19T22:00:00Z",
    new Date("2026-09-19T22:00:00Z"),
  ])("preserves an explicit authored instant: %s", (value) => {
    expect(readingDate.parse(value).toISOString()).toBe(
      "2026-09-19T22:00:00.000Z",
    );
  });

  it("keeps date-only values valid for editorial dates, not readings", () => {
    expect(editorialBase.date.parse("2026-09-19").toISOString()).toBe(
      "2026-09-19T00:00:00.000Z",
    );
    expect(readingDate.safeParse("2026-09-19").success).toBe(false);
  });
});

/**
 * Sveltia writes an explicit YAML `null` for a `required: false` widget an
 * editor leaves blank — not just an absent key — and a plain text widget
 * sometimes writes `""` instead. `optionalCmsField` and `optionalCmsList` are
 * the two places that normalize every such empty shape to `undefined`/`[]`,
 * so this file exercises them directly against representative values rather
 * than duplicating one test per collection field.
 */

describe("optionalCmsField", () => {
  // One row per category of widget the CMS can leave blank: an object group
  // (heroImage/portrait), a URL/email string, a plain string, a number, and a
  // date. Each must accept Sveltia's empty shapes and keep rejecting a value
  // that is genuinely invalid.
  const cases = [
    {
      label: "object widget (image)",
      schema: editorialImageSchema,
      valid: { src: "https://example.com/a.jpg", alt: "A description" },
      invalid: { src: "not-a-url", alt: "A description" },
    },
    {
      label: "url widget",
      schema: z.url(),
      valid: "https://example.com",
      invalid: "not a url",
    },
    {
      label: "email widget",
      schema: z.email(),
      valid: "press@example.com",
      invalid: "not an email",
    },
    {
      label: "string widget",
      schema: z.string().min(1),
      valid: "San Jose, California",
      invalid: 42,
    },
    {
      label: "number widget",
      schema: z.number().int().positive(),
      valid: 2018,
      invalid: -1,
    },
    {
      label: "date widget",
      schema: z.coerce.date(),
      valid: "2026-01-01",
      invalid: "not a date",
    },
    {
      label: "isbn relation widget",
      schema: isbn13,
      valid: "9788185604695",
      invalid: "not-an-isbn",
    },
  ] as const;

  it.each(cases)(
    "normalizes every empty shape of a $label to undefined",
    ({ schema, valid }) => {
      const optional = optionalCmsField(schema);

      expect(optional.parse(null)).toBeUndefined();
      expect(optional.parse(undefined)).toBeUndefined();
      expect(optional.parse(valid)).toEqual(schema.parse(valid));
    },
  );

  // Only a plain string widget can be blanked to `""` by Sveltia; a URL,
  // email, number, and date widget never serialize their empty state that
  // way, so `""` is left for the base schema to reject there.
  it("also normalizes an empty string for a string widget", () => {
    expect(optionalCmsField(z.string().min(1)).parse("")).toBeUndefined();
  });

  it.each(cases)(
    "still rejects a genuinely invalid $label",
    ({ schema, invalid }) => {
      expect(() => optionalCmsField(schema).parse(invalid)).toThrow();
    },
  );
});

describe("optionalCmsList", () => {
  const listSchema = z.array(z.string()).default([]);

  it("normalizes an explicit null to an empty list", () => {
    expect(optionalCmsList(listSchema).parse(null)).toEqual([]);
  });

  it("keeps the default for a missing key", () => {
    expect(optionalCmsList(listSchema).parse(undefined)).toEqual([]);
  });

  it("keeps a filled list untouched", () => {
    expect(optionalCmsList(listSchema).parse(["a", "b"])).toEqual(["a", "b"]);
  });

  it("still enforces item validation", () => {
    const withRefine = z
      .array(z.string())
      .default([])
      .refine((ids) => new Set(ids).size === ids.length, "no duplicates");

    expect(() => optionalCmsList(withRefine).parse(["a", "a"])).toThrow();
  });
});

describe("topicsSchema", () => {
  it("normalizes null to an empty list, as Sveltia writes for an empty multi-select", () => {
    expect(topicsSchema.parse(null)).toEqual([]);
  });

  // Topics are entries in a collection an editor maintains, so there is no
  // fixed list to check a value against here. What the schema still holds to
  // is the shape of an id: an entry stores the topic's filename, and anything
  // that is not one could not name a term. That a stored id names a term which
  // exists is checked in `scripts/content/taxonomy.test.ts`.
  it("rejects a value that is not a term id", () => {
    expect(() => topicsSchema.parse(["Not A Slug"])).toThrow();
  });

  it("accepts an id of a topic an editor has added", () => {
    expect(topicsSchema.parse(["a-brand-new-topic"])).toEqual([
      "a-brand-new-topic",
    ]);
  });
});

describe("editorialBase.heroImage", () => {
  // The regression this file exists to prevent: Sveltia writes `heroImage:
  // null` for a hero image an editor never fills in, and
  // `editorialImageSchema.optional()` alone rejects it because `.optional()`
  // accepts only `undefined`.
  it("accepts an explicit null, as Sveltia writes for a blank hero image", () => {
    expect(editorialBase.heroImage.parse(null)).toBeUndefined();
  });

  it("still requires both src and alt when a hero image is present", () => {
    expect(() =>
      editorialBase.heroImage.parse({ src: "https://x.test" }),
    ).toThrow();
  });
});

describe("the fixed book-readings regression entry", () => {
  /*
   * The frontmatter that broke the build (df7f56e, run 33434271406), checked
   * field by field against the schema piece that now handles it, so this file
   * fails again if the fix regresses.
   *
   * It is pinned here rather than read back out of the entry it came from.
   * That entry is editorial content: an editor filling in its registration
   * link is the CMS working as intended, and it should not turn into a
   * failing schema test. What is being guarded is the shape Sveltia writes
   * for a blank field, and that shape is fixed even when the entry is not.
   */
  const frontmatter = parse(`
title: 'Buffalo Nationalism: Chapters 34 - 42'
date: 2026-08-29T15:00:00
location: Human Agenda, San Jose
book: 'buffalo-nationalism'
participants: []
registrationUrl: ''
topics:
  - religion-and-culture
  - hindutva
resources: []
heroImage: null
sourceUrl: ''
featured: true
draft: false
`) as {
    heroImage: unknown;
    sourceUrl: unknown;
    registrationUrl: unknown;
    topics: unknown;
  };

  it("parses heroImage: null", () => {
    expect(optionalEditorialImage.parse(frontmatter.heroImage)).toBeUndefined();
  });

  describe("static editorial images and resources", () => {
    it.each([
      "/media/articles/new-article/image.jpg",
      "/media/speakers/new-speaker/portrait.webp",
      "/media/shared/shared-image.png",
      "https://example.com/image.jpg",
    ])("accepts a public or genuine external editorial image: %s", (src) => {
      expect(
        editorialImageSchema.parse({ src, alt: "An event gathering" }).src,
      ).toBe(src);
    });

    it.each([
      "/media/press-releases/new-statement/statement.pdf",
      "/media/shared/reports/statement.pdf#page=2",
      "/media/conferences/new-conference/flyer.jpg?download=1",
      "/who-said-what/",
      "/book-readings/?book=example#sessions",
      "#references",
      "https://example.com/reference.pdf",
      "http://example.com/reference",
    ])("preserves a valid local or third-party resource: %s", (url) => {
      expect(resourceUrl.parse(url)).toBe(url);
      expect(linkSchema.parse({ label: "Read the document", url }).url).toBe(
        url,
      );
    });

    it.each([
      "javascript:alert(1)",
      "data:text/html,test",
      "//example.com/file.pdf",
      "/../private",
      "/%2e%2e/private",
      "/safe/%2fprivate",
      "/safe/%252e%252e/private",
      "/safe/%00private",
      "/safe/%GG",
      "/media/shared/../private.pdf",
      "/media/archive/2023/08/statement.pdf",
      "/media/archive/2018/07/conference-poster.jpg",
      "/media/archive/2023/08/../private.pdf",
      "/media/archive/2023/%2e%2e/private.pdf",
      "/media/books/entry/private.txt",
      "/media/report.pdf",
    ])("rejects an unsafe or unserved local resource: %s", (url) => {
      expect(resourceUrl.safeParse(url).success).toBe(false);
    });

    it("does not turn local resources into external-source provenance", () => {
      expect(optionalUrl.parse(undefined)).toBeUndefined();
      expect(optionalUrl.parse("https://example.com/source")).toBe(
        "https://example.com/source",
      );
      expect(optionalUrl.safeParse("/media/shared/source.pdf").success).toBe(
        false,
      );
    });
  });

  it("parses the blank sourceUrl and registrationUrl strings", () => {
    expect(optionalUrl.parse(frontmatter.sourceUrl)).toBeUndefined();
    expect(optionalUrl.parse(frontmatter.registrationUrl)).toBeUndefined();
  });

  it("parses the filled-in topics list", () => {
    expect(topicsSchema.parse(frontmatter.topics)).toEqual([
      "religion-and-culture",
      "hindutva",
    ]);
  });
});
