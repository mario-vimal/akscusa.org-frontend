import { describe, expect, it } from "vitest";

import { isValidIsbn13, normalizeIsbn, openLibraryUrl } from "./isbn";

// The two editions the reading circle has worked through.
const annihilationOfCaste = "9788189059637";
const riddlesInHinduism = "9788189059774";

describe("normalizeIsbn", () => {
  it("strips the hyphens and spaces people type", () => {
    expect(normalizeIsbn("978-81-89059-63-7")).toBe(annihilationOfCaste);
    expect(normalizeIsbn(" 978 81 89059 63 7 ")).toBe(annihilationOfCaste);
  });
});

describe("isValidIsbn13", () => {
  it("accepts real ISBN-13s", () => {
    expect(isValidIsbn13(annihilationOfCaste)).toBe(true);
    expect(isValidIsbn13(riddlesInHinduism)).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    expect(isValidIsbn13("9788189059638")).toBe(false);
    expect(isValidIsbn13("9788189059775")).toBe(false);
  });

  it("catches a pair of transposed digits", () => {
    expect(isValidIsbn13("9788189059673")).toBe(false);
  });

  it("rejects anything that is not thirteen digits", () => {
    expect(isValidIsbn13("")).toBe(false);
    expect(isValidIsbn13("8189059637")).toBe(false);
    expect(isValidIsbn13("97881890596371")).toBe(false);
    expect(isValidIsbn13("978818905963X")).toBe(false);
    expect(isValidIsbn13("978-81-89059-63-7")).toBe(false);
  });
});

describe("openLibraryUrl", () => {
  it("links to the edition by its bare ISBN", () => {
    expect(openLibraryUrl("978-81-89059-63-7")).toBe(
      `https://openlibrary.org/isbn/${annihilationOfCaste}`,
    );
  });
});
