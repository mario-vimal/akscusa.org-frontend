import { z } from "astro/zod";
import { describe, expect, it, vi } from "vitest";

import { cmsEntryId } from "~/schemas/shared";

const loaderIds = vi.hoisted(
  () => new Map<string, ((options: { entry: string }) => string) | undefined>(),
);

vi.mock("astro:content", () => ({
  defineCollection: (definition: unknown) => definition,
}));
vi.mock("astro/loaders", () => ({
  glob: (options: {
    base: string;
    generateId?: (options: { entry: string }) => string;
  }) => {
    loaderIds.set(options.base, options.generateId);
    return { name: "glob", load: async () => {} };
  },
}));

import { comics, toolkitScenarios } from "~/schemas/artwork";
import { authors, books, bookReadings } from "~/schemas/books";
import {
  articles,
  conferences,
  pressReleases,
  programs,
  speakers,
} from "~/schemas/editorial";
import { generalBodyMeetings } from "~/schemas/organization";
import { categories, topics } from "~/schemas/taxonomy";

function schemaOf(collection: { schema?: unknown }) {
  if (!(collection.schema instanceof z.ZodType)) {
    throw new Error("Expected a static collection schema.");
  }
  return collection.schema;
}

const editorial = {
  title: "An editor's new entry",
  date: "2026-09-19",
  summary: "A prospective entry used to exercise the publishing contract.",
};

describe("CMS collection schemas", () => {
  it("assigns the same filename ID policy to every CMS loader", () => {
    expect(loaderIds.size).toBe(14);
    for (const [base, generateId] of loaderIds) {
      expect(generateId, base).toBe(cmsEntryId);
      expect(generateId?.({ entry: "reading_group-~-notes.md" })).toBe(
        "reading_group-~-notes",
      );
      expect(generateId?.({ entry: "reading_group-~-notes/index.md" })).toBe(
        "reading_group-~-notes",
      );
    }
  });

  it("overrides the editorial date with a timezone-safe reading timestamp", () => {
    const entry = {
      ...editorial,
      location: "Online",
      date: "2026-09-19T22:00:00Z",
    };
    expect(schemaOf(bookReadings).parse(entry)).toMatchObject({
      date: new Date("2026-09-19T22:00:00Z"),
    });
    for (const date of ["2026-09-19", "2026-09-19T15:00:00"]) {
      expect(schemaOf(bookReadings).safeParse({ ...entry, date }).success).toBe(
        false,
      );
    }
  });

  it.each(["", "   ", null, undefined])(
    "accepts an optional blank ISBN %j in a complete book",
    (isbn) => {
      expect(
        schemaOf(books).parse({
          title: "A pamphlet without an ISBN",
          isbn,
          cover: "/media/books/new-pamphlet/img_1234.jpg",
          authors: ["reading_group-~-notes"],
        }),
      ).toMatchObject({
        title: "A pamphlet without an ISBN",
        isbn: undefined,
        authors: ["reading_group-~-notes"],
      });
    },
  );

  it("accepts normalized local portraits while rejecting remote author portraits", () => {
    const entry = {
      name: "Édouard Glissant",
      portrait: {
        src: "/media/authors/edouard-glissant/photo-ete.png",
        alt: "The author at a reading",
      },
    };
    expect(schemaOf(authors).safeParse(entry).success).toBe(true);
    expect(
      schemaOf(authors).safeParse({
        ...entry,
        portrait: { ...entry.portrait, src: "https://example.com/photo.png" },
      }).success,
    ).toBe(false);
  });

  it("uses normalized relation values in articles, conferences and vocabularies", () => {
    expect(
      schemaOf(articles).safeParse({
        ...editorial,
        category: "reading_group-~-notes",
        topics: ["reading_group-~-notes"],
      }).success,
    ).toBe(true);
    expect(
      schemaOf(conferences).safeParse({
        ...editorial,
        format: "online",
        speakers: ["reading_group-~-notes"],
      }).success,
    ).toBe(true);
    for (const vocabulary of [topics, categories]) {
      expect(
        schemaOf(vocabulary).safeParse({ label: "சாதி ஒழிப்பு" }).success,
      ).toBe(true);
    }
  });

  it("accepts a newly uploaded program poster and General Body PDF", () => {
    expect(
      schemaOf(programs).safeParse({
        ...editorial,
        kind: "event",
        status: "scheduled",
        posters: [
          {
            src: "/media/programs/new-event/a-photo_2.jpg",
            alt: "Event announcement",
          },
        ],
      }).success,
    ).toBe(true);
    const meeting = {
      edition: 12,
      date: "2030-09-19",
      location: "Online",
      papers: [
        {
          kind: "report",
          file: "/media/general-body-meetings/new-meeting/annual-report.pdf",
        },
      ],
    };
    expect(schemaOf(generalBodyMeetings).safeParse(meeting).success).toBe(true);
    expect(
      schemaOf(generalBodyMeetings).safeParse({
        ...meeting,
        papers: [
          {
            kind: "report",
            file: "/media/general-body-meetings/new-meeting/annual-report.png",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("uses the shared local-image filename contract for both kinds of artwork", () => {
    const panel = { alt: "A conversation at a meeting", transcript: "Hello." };
    expect(
      schemaOf(comics).safeParse({
        ...editorial,
        credits: [{ name: "An artist" }],
        panels: [{ ...panel, src: "/media/comics/new-comic/img_1234.jpg" }],
      }).success,
    ).toBe(true);
    expect(
      schemaOf(toolkitScenarios).safeParse({
        title: "A prospective scenario",
        order: 4,
        setting: "A meeting",
        summary: "A discussion.",
        prompt: "What would you say?",
        panels: [
          {
            ...panel,
            src: "/media/toolkit-scenarios/new-scenario/img_1234.jpg",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts local hero images and speaker portraits without cloud storage", () => {
    expect(
      schemaOf(articles).safeParse({
        ...editorial,
        category: "history",
        heroImage: {
          src: "/media/articles/new-article/image.jpg",
          alt: "A gathering",
        },
      }).success,
    ).toBe(true);
    expect(
      schemaOf(speakers).safeParse({
        name: "A speaker",
        role: "Organiser",
        bio: "A biography.",
        portrait: {
          src: "/media/speakers/new-speaker/portrait.webp",
          alt: "The speaker",
        },
      }).success,
    ).toBe(true);
  });

  it("accepts local attachments and keeps genuine external resource links", () => {
    expect(
      schemaOf(pressReleases).safeParse({
        ...editorial,
        issuedBy: ["AKSC"],
        attachments: [
          {
            label: "Statement",
            url: "/media/press-releases/new-statement/statement.pdf#page=2",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      schemaOf(books).safeParse({
        title: "A reading",
        resources: [
          { label: "Local document", url: "/media/shared/reading.pdf" },
          {
            label: "External document",
            url: "https://example.com/reading.pdf",
          },
        ],
      }).success,
    ).toBe(true);
  });
});
