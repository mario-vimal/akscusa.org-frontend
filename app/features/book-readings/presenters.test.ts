import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { author, book, reading } from "~/features/books/test-fixtures";
import { resolveReadings } from "~/features/books/resolve";
import {
  bookReadingBadge,
  bookReadingDetails,
  nextSession,
  readingEntries,
} from "./presenters";
import { logFacets } from "./search";

const topicLabel = (id: string) => new Map([["caste", "Caste"]]).get(id) ?? id;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T07:00:00-07:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reading participation", () => {
  const upcoming = reading(
    "2026-08-31-why-were-women-enslaved",
    "2026-09-19T15:00:00-07:00",
    { registrationUrl: "https://bit.ly/akscrnd" },
  );

  it("keeps the September 19 participation URL on the opener and detail page", () => {
    expect(nextSession(upcoming)).toMatchObject({
      participation: {
        label: "Join or register",
        href: "https://bit.ly/akscrnd",
      },
    });
    expect(bookReadingDetails(upcoming)).toContainEqual({
      term: "Participation",
      description: "Join or register",
      href: "https://bit.ly/akscrnd",
    });
  });

  it("does not pretend that every provided link is a registration form", () => {
    const zoom = reading("zoom", "2026-09-20T15:00:00-07:00", {
      registrationUrl: "https://example.zoom.us/j/123",
    });
    expect(nextSession(zoom)).toMatchObject({
      participation: {
        label: "Join or register",
        href: "https://example.zoom.us/j/123",
      },
    });
  });

  it("retains past session links without inviting attendance at a past event", () => {
    const past = reading("past", "2026-09-04T19:00:00-07:00", {
      registrationUrl: "https://bit.ly/akscrnd",
    });
    expect(nextSession(past)).toMatchObject({
      upcoming: false,
      participation: {
        label: "Session participation link",
        href: "https://bit.ly/akscrnd",
      },
    });
    expect(bookReadingDetails(past)).toContainEqual({
      term: "Participation",
      description: "Session participation link",
      href: "https://bit.ly/akscrnd",
    });
  });

  it("does not invent a link or a venue when none is provided", () => {
    const session = reading("in-person", "2026-09-19T15:00:00-07:00", {
      location: "Human Agenda, San Jose",
    });
    expect(nextSession(session)).toMatchObject({
      location: "Human Agenda, San Jose",
    });
    expect(nextSession(session)).not.toHaveProperty(
      "participation",
      expect.anything(),
    );
    expect(
      bookReadingDetails(session).map((detail) => detail.term),
    ).not.toContain("Participation");
  });
});

describe("reading publication states", () => {
  const published = book("published", { title: "A published book" });
  const draft = book(
    "draft",
    {
      title: "An unpublished title",
      draft: true,
      isbn: "9788189059637",
      cover: "/media/books/private-cover.jpg",
    },
    [author("unpublished-author", { name: "An unpublished author" })],
  );
  const sessions = [
    reading("published-session", "2026-09-04T19:00:00-07:00", {
      book: "published",
    }),
    reading("draft-session", "2026-09-03T15:00:00-07:00", { book: "draft" }),
    reading("articles-session", "2026-09-02T15:00:00-07:00"),
  ];

  const resolvedBooks = () => {
    const { bookOfReading } = resolveReadings(
      [published.book, draft.book],
      [published.book],
      sessions,
      (entry) => entry.data.book,
    );
    return new Map([...bookOfReading].map(([id]) => [id, published]));
  };

  it("distinguishes published books, unpublished targets, and articles", () => {
    const entries = readingEntries(sessions, resolvedBooks(), topicLabel);
    expect(entries).toMatchObject([
      {
        key: "published",
        bookState: "published",
        readsArticles: false,
        href: "/books/published/",
      },
      {
        key: "draft-session",
        bookState: "unpublished",
        readsArticles: false,
        href: "/book-readings/draft-session/",
        authors: [],
      },
      {
        key: "articles-session",
        bookState: "none",
        readsArticles: true,
        href: "/book-readings/articles-session/",
      },
    ]);
  });

  it("offers no unpublished book or author facet and leaks no draft metadata", () => {
    const entries = readingEntries(sessions, resolvedBooks(), topicLabel);
    expect(logFacets(entries)).toEqual({
      books: [{ value: "published", label: "A published book" }],
      authors: [],
      years: [{ value: "2026", label: "2026" }],
    });
    const unpublished = entries.find((entry) => entry.key === "draft-session");
    expect(unpublished).toBeDefined();
    expect(unpublished?.search).not.toContain("unpublished");
    expect(unpublished?.search).not.toContain("9788189059637");
    expect(unpublished?.cover).toBeUndefined();
  });

  it("still fails for a genuinely missing reference", () => {
    expect(() =>
      resolveReadings(
        [published.book],
        [published.book],
        sessions,
        (entry) => entry.data.book,
      ),
    ).toThrow(/draft-session.*draft/);
  });

  it("handles empty collections without placeholder book or article entries", () => {
    expect(readingEntries([], new Map(), topicLabel)).toEqual([]);
    expect(logFacets(readingEntries([], new Map(), topicLabel))).toEqual({
      books: [],
      authors: [],
      years: [],
    });
  });
});

describe("reading calendar and ordering", () => {
  it("marks yesterday's late Pacific reading past everywhere it is presented", () => {
    const session = reading("yesterday", "2026-09-04T19:00:00-07:00");
    const [entry] = readingEntries([session], new Map(), topicLabel);
    expect(bookReadingBadge(session)).toEqual({
      label: "Past reading",
      tone: "muted",
    });
    expect(nextSession(session).upcoming).toBe(false);
    expect(entry.upcoming).toBe(false);
    expect(entry.sessions[0].upcoming).toBe(false);
  });

  it("keeps earlier sessions today upcoming under the same-day policy", () => {
    const session = reading("today", "2026-09-05T00:30:00-07:00");
    const [entry] = readingEntries([session], new Map(), topicLabel);
    expect(bookReadingBadge(session).label).toBe("Upcoming");
    expect(nextSession(session).upcoming).toBe(true);
    expect(entry.upcoming).toBe(true);
    expect(entry.sessions[0].upcoming).toBe(true);
  });

  it("stabilizes equal-date entries without depending on collection arrival order", () => {
    const a = reading("a", "2026-09-04T19:00:00-07:00");
    const z = reading("z", "2026-09-04T19:00:00-07:00");
    const future = reading("future", "2026-09-19T15:00:00-07:00");
    for (const sessions of [
      [z, a, future],
      [future, a, z],
    ]) {
      expect(
        readingEntries(sessions, new Map(), topicLabel).map(
          (entry) => entry.key,
        ),
      ).toEqual(["future", "a", "z"]);
    }
  });

  it("groups a book newest first with stable tied sittings, Pacific years, and full search data", () => {
    const entry = book(
      "ambedkar",
      {
        title: "Ambedkar",
        subtitle: "Towards an Enlightened India",
        topics: ["caste"],
        summary: "A note in verse.\nAcross two lines.",
      },
      [
        author("second", { name: "Second credited" }),
        author("first", { name: "First alphabetically" }),
      ],
    );
    const sessions = [
      reading("z", "2026-01-01T01:00:00Z", {
        book: "ambedkar",
        title: "Ambedkar: Part two",
        posters: [{ src: "/media/book-readings/z.jpg", alt: "Second flyer" }],
      }),
      reading("a", "2026-01-01T01:00:00Z", {
        book: "ambedkar",
        title: "Ambedkar: Part one",
      }),
      reading("earlier", "2024-12-31T20:00:00-08:00", {
        book: "ambedkar",
        title: "Ambedkar: Earlier session",
      }),
    ];
    const [result] = readingEntries(
      sessions,
      new Map(sessions.map((session) => [session.id, entry])),
      topicLabel,
    );
    expect(result.sessionCount).toBe(3);
    expect(result.sessions.map((session) => session.href)).toEqual([
      "/book-readings/a/",
      "/book-readings/z/",
      "/book-readings/earlier/",
    ]);
    expect(result.years).toEqual([2025, 2024]);
    expect(result.spanLabel).toBe("December 2024 – December 2025");
    expect(result.sessions[0].dateLabel).toBe("Dec 31, 2025");
    expect(result.authors.map((person) => person.slug)).toEqual([
      "second",
      "first",
    ]);
    expect(result.topics).toEqual(["Caste"]);
    expect(result.search).toContain("a note in verse. across two lines.");
    expect(result.search).toContain("ambedkar: part two");
    expect(result.posters[0].caption).toBe("Ambedkar: Part two");
  });
});
