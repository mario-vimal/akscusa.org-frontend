import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { book, reading } from "~/features/books/test-fixtures";
import { conference, program } from "~/features/editorial/test-fixtures";
import {
  byNewestRefFirst,
  currentBook,
  featuredRef,
  spotlight,
} from "./presenters";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T07:00:00-07:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("spotlight", () => {
  it("falls back to a June 2026 program instead of an October 2025 conference", () => {
    expect(
      spotlight(
        [conference("older-conference", "2025-10-18")],
        [program("newer-program", "2026-06-20")],
      ),
    ).toMatchObject({
      collection: "programs",
      id: "newer-program",
      upcoming: false,
    });
  });

  it("compares all past gatherings rather than trusting either input order", () => {
    const conferences = [
      conference("older", "2024-10-18"),
      conference("newest", "2026-08-20"),
    ];
    const programs = [
      program("program-older", "2025-06-20"),
      program("program-newer", "2026-06-20"),
    ];
    for (const entries of [conferences, [...conferences].reverse()]) {
      expect(spotlight(entries, programs)?.id).toBe("newest");
    }
  });

  it("chooses the soonest upcoming gathering across both collections", () => {
    expect(
      spotlight(
        [conference("later-conference", "2026-10-18")],
        [program("sooner-program", "2026-09-20")],
      )?.id,
    ).toBe("sooner-program");
  });

  it("preserves explicit featured precedence", () => {
    const featuredPast = conference("featured-past", "2025-10-18", {
      featured: true,
    });
    const sooner = program("sooner", "2026-09-20");
    expect(spotlight([featuredPast], [sooner])?.id).toBe("featured-past");

    const featuredFuture = program("featured-future", "2026-10-20", {
      featured: true,
    });
    expect(spotlight([featuredPast], [sooner, featuredFuture])?.id).toBe(
      "featured-future",
    );
  });

  it("uses the newest featured fallback rather than conference-first concatenation", () => {
    expect(
      spotlight(
        [conference("old-featured", "2025-10-18", { featured: true })],
        [program("new-featured", "2026-06-20", { featured: true })],
      )?.id,
    ).toBe("new-featured");
  });

  it("breaks equal-date ties by stable ID, then collection for an identical ID", () => {
    const a = conference("a", "2026-06-20");
    const z = conference("z", "2026-06-20");
    expect(spotlight([z, a], [])?.id).toBe("a");
    expect(spotlight([a, z], [])?.id).toBe("a");
    expect(spotlight([z], [program("a", "2026-06-20")])?.id).toBe("a");
    expect(spotlight([a], [program("a", "2026-06-20")])?.collection).toBe(
      "conferences",
    );
  });

  it("keeps a multi-day conference current on its last UTC day", () => {
    const active = conference("active", "2026-09-04", {
      endDate: new Date("2026-09-05"),
      registrationUrl: "https://example.org/conference",
    });
    expect(spotlight([active], [program("next", "2026-09-20")])).toMatchObject({
      id: "active",
      upcoming: true,
      registrationUrl: "https://example.org/conference",
    });
  });

  it("handles either or both collections being empty", () => {
    expect(spotlight([], [])).toBeUndefined();
    expect(
      spotlight([conference("only-conference", "2025-10-18")], [])?.id,
    ).toBe("only-conference");
    expect(spotlight([], [program("only-program", "2026-06-20")])?.id).toBe(
      "only-program",
    );
  });
});

describe("homepage readings", () => {
  it("selects the same real next Pacific reading as the circle", () => {
    const yesterday = reading("yesterday", "2026-09-04T19:00:00-07:00");
    const next = reading("next", "2026-09-19T15:00:00-07:00");
    const later = reading("later", "2026-10-19T15:00:00-07:00");
    const entries = [later, next, yesterday];
    const books = new Map([
      [yesterday.id, book("previous-book")],
      [next.id, book("next-book")],
      [later.id, book("later-book")],
    ]);
    expect(currentBook(entries, books)).toMatchObject({
      href: "/books/next-book/",
      sessionOn: next.data.date,
    });
    expect(featuredRef("bookReadings", yesterday).upcoming).toBe(false);
    expect(featuredRef("bookReadings", next).upcoming).toBe(true);
  });

  it("does not expose an unpublished book or invent one for an article sitting", () => {
    const unpublished = reading("draft-session", "2026-09-19T15:00:00-07:00", {
      book: "unpublished",
    });
    const articles = reading("articles", "2026-09-20T15:00:00-07:00");
    expect(currentBook([unpublished, articles], new Map())).toBeUndefined();
    expect(currentBook([], new Map())).toBeUndefined();
  });

  it("chooses the latest held book when nothing is scheduled, independent of input order", () => {
    const old = reading("old", "2025-09-04T19:00:00-07:00");
    const recent = reading("recent", "2026-09-04T19:00:00-07:00");
    const entries = [old, recent];
    const books = new Map(
      entries.map((session) => [session.id, book(session.id)]),
    );
    expect(currentBook(entries, books)?.href).toBe("/books/recent/");
  });
});

describe("mixed recent work", () => {
  it("sorts dated ties independently of collection loading and concatenation order", () => {
    const a = featuredRef("programs", program("a", "2026-06-20"));
    const z = featuredRef("conferences", conference("z", "2026-06-20"));
    const otherA = featuredRef("conferences", conference("a", "2026-06-20"));
    expect(
      [z, a, otherA].sort(byNewestRefFirst).map((entry) => entry.href),
    ).toEqual(["/conferences/a/", "/programs/a/", "/conferences/z/"]);
  });
});
