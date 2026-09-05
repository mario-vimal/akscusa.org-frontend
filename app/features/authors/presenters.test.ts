import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { author, book, reading } from "~/features/books/test-fixtures";
import { authorPage } from "./presenters";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T07:00:00-07:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("authorPage", () => {
  const periyar = author("periyar", {
    name: "Periyar",
    bio: "First paragraph.\n\nSecond paragraph.",
  });
  const volume = book(
    "why-were-women-enslaved",
    {
      title: "Why Were Women Enslaved?",
    },
    [periyar],
  );

  it("counts future sessions neutrally instead of claiming they were already held", () => {
    const page = authorPage({
      author: periyar,
      books: [
        {
          ...volume,
          readings: [reading("future", "2026-09-19T15:00:00-07:00")],
        },
      ],
    });
    expect(page.shelfLine).toBe("1 book · 1 session");
    expect(page.description).toContain("with 1 session listed");
    expect(page.description).not.toMatch(/read (at|across)|not yet read/);
    expect(page.books[0].upcoming).toBe(true);
    expect(page.bio).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("does not mistake an empty record for proof that a book was never read", () => {
    const page = authorPage({
      author: periyar,
      books: [{ ...volume, readings: [] }],
    });
    expect(page.shelfLine).toBe("1 book · 0 sessions");
    expect(page.description).toContain("with 0 sessions listed");
    expect(page.description).not.toContain("not yet read");
    expect(page.books[0].sessions).toEqual([]);
    expect(page.books[0].upcoming).toBe(false);
  });

  it("uses the same Pacific day and stable sitting order as the reading log", () => {
    const a = reading("a", "2026-09-04T19:00:00-07:00");
    const z = reading("z", "2026-09-04T19:00:00-07:00");
    const page = authorPage({
      author: periyar,
      books: [{ ...volume, readings: [z, a] }],
    });
    expect(page.books[0].upcoming).toBe(false);
    expect(page.books[0].sessions.map((session) => session.href)).toEqual([
      "/book-readings/a/",
      "/book-readings/z/",
    ]);
  });

  it("retains co-author credit order and omits only the author whose page this is", () => {
    const others = [
      author("z", { name: "Z first in the credits" }),
      periyar,
      author("a", { name: "A last in the credits" }),
    ];
    const page = authorPage({
      author: periyar,
      books: [
        {
          ...book("edited-volume", {}, others),
          readings: [],
        },
      ],
    });
    expect(page.books[0].coAuthors).toBe(
      "Z first in the credits, A last in the credits",
    );
  });

  it("handles an empty shelf", () => {
    const page = authorPage({ author: periyar, books: [] });
    expect(page.books).toEqual([]);
    expect(page.shelfLine).toBe("0 books · 0 sessions");
  });
});
