import { describe, expect, it } from "vitest";

import { bookAuthors, bookDescription } from "./presenters";

const book = (title: string, authors: readonly string[], summary?: string) => ({
  data: { title, authors, summary },
});

const periyar = book(
  "Why Were Women Enslaved?",
  ["Periyar E. V. Ramasamy"],
  "Periyar's case that the subjection of women is built and can be dismantled.",
);

describe("bookAuthors", () => {
  it("joins the authors an entry names", () => {
    expect(bookAuthors(periyar)).toBe("Periyar E. V. Ramasamy");
    expect(bookAuthors(book("Ambedkar", ["A", "B"]))).toBe("A, B");
  });

  it("names nobody for an entry Open Library could not fill", () => {
    expect(bookAuthors(book("Why Were Women Enslaved?", []))).toBeUndefined();
  });
});

describe("bookDescription", () => {
  it("uses the summary AKSC wrote", () => {
    expect(bookDescription(periyar)).toBe(periyar.data.summary);
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
