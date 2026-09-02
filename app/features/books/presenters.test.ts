import { describe, expect, it } from "vitest";

import { bookAuthorLinks, bookByline, bookDescription } from "./presenters";

const book = (title: string, names: readonly string[], summary?: string) => ({
  book: { data: { title, summary } },
  authors: names.map((name) => ({
    id: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
    data: { name },
  })),
});

const periyar = book(
  "Why Were Women Enslaved?",
  ["Periyar E. V. Ramasamy"],
  "Periyar's case that the subjection of women is built and can be dismantled.",
);

describe("bookByline", () => {
  it("joins the authors the entry's slugs resolved to", () => {
    expect(bookByline(periyar)).toBe("Periyar E. V. Ramasamy");
    expect(bookByline(book("Ambedkar", ["A", "B"]))).toBe("A, B");
  });

  it("names nobody for an entry without authors", () => {
    expect(bookByline(book("Why Were Women Enslaved?", []))).toBeUndefined();
  });
});

describe("bookAuthorLinks", () => {
  it("points each name at that author's own page", () => {
    expect(bookAuthorLinks(book("Ambedkar", ["Gail Omvedt"]))).toEqual([
      { slug: "gail-omvedt", name: "Gail Omvedt" },
    ]);
  });

  it("has nothing to link for an entry that names no author", () => {
    expect(bookAuthorLinks(book("Buffalo Nationalism", []))).toEqual([]);
  });
});

describe("bookDescription", () => {
  it("uses the summary AKSC wrote", () => {
    expect(bookDescription(periyar)).toBe(periyar.book.data.summary);
  });

  it("falls back to the book itself when there is no summary yet", () => {
    expect(
      bookDescription(book("Buffalo Nationalism", ["Kancha Ilaiah"])),
    ).toBe(
      "Buffalo Nationalism by Kancha Ilaiah, on the Ambedkar King Study Circle's reading list.",
    );
  });

  it("leaves out a byline it does not have", () => {
    expect(bookDescription(book("Buffalo Nationalism", []))).toBe(
      "Buffalo Nationalism, on the Ambedkar King Study Circle's reading list.",
    );
  });
});
