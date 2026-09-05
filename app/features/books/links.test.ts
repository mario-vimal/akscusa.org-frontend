import { expect, it } from "vitest";

import { bookHref } from "./links";

it("links by stable book ID without requiring an ISBN or the query runtime", () => {
  const edition = { id: "annihilation-of-caste", isbn: "9788189059637" };
  const corrected = { ...edition, isbn: "9788189059774" };
  expect(bookHref(edition)).toBe("/books/annihilation-of-caste/");
  expect(bookHref(corrected)).toBe(bookHref(edition));
  expect(bookHref({ id: "a-pamphlet" })).toBe("/books/a-pamphlet/");
});
