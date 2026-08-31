import { describe, expect, it } from "vitest";

import { fieldsToFill, isBlank, yearFromPublishDate } from "./fields.ts";

describe("isBlank", () => {
  it("treats everything Sveltia writes for an empty field as blank", () => {
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank("")).toBe(true);
    expect(isBlank("   ")).toBe(true);
    expect(isBlank([])).toBe(true);
    expect(isBlank([""])).toBe(true);
  });

  it("treats a stated value as stated", () => {
    expect(isBlank("Navayana")).toBe(false);
    expect(isBlank(2014)).toBe(false);
    expect(isBlank(0)).toBe(false);
    expect(isBlank(["B. R. Ambedkar"])).toBe(false);
  });
});

describe("yearFromPublishDate", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("reads the year out of the shapes a catalogue uses", () => {
    expect(yearFromPublishDate("2014", now)).toBe(2014);
    expect(yearFromPublishDate("Nov 2014", now)).toBe(2014);
    expect(yearFromPublishDate("2014-11-01", now)).toBe(2014);
    expect(yearFromPublishDate("November 1, 2014", now)).toBe(2014);
  });

  it("refuses to choose between two years", () => {
    expect(yearFromPublishDate("1936, reprinted 2014", now)).toBeUndefined();
  });

  it("accepts a date that repeats one year", () => {
    expect(yearFromPublishDate("2014-01-01 (2014 printing)", now)).toBe(2014);
  });

  it("ignores a year further ahead than next", () => {
    expect(yearFromPublishDate("2027", now)).toBe(2027);
    expect(yearFromPublishDate("2098", now)).toBeUndefined();
  });

  it("returns nothing for anything that names no year", () => {
    expect(yearFromPublishDate("", now)).toBeUndefined();
    expect(yearFromPublishDate("undated", now)).toBeUndefined();
    expect(yearFromPublishDate(undefined, now)).toBeUndefined();
    expect(yearFromPublishDate(2014, now)).toBeUndefined();
  });
});

describe("fieldsToFill", () => {
  const record = {
    title: "Annihilation of Caste",
    subtitle: "The Annotated Critical Edition",
    authors: ["B. R. Ambedkar"],
    publisher: "Navayana",
    publishedYear: 2014,
    firstPublishedYear: 1936,
  };

  it("fills every field the entry has left blank", () => {
    expect(fieldsToFill({}, record)).toEqual(record);
    expect(
      fieldsToFill({ subtitle: "", authors: [], publishedYear: null }, record),
    ).toEqual(record);
  });

  it("fills the title and the authors an entry never stated", () => {
    // The whole point of the ISBN: an entry that says only that can still
    // name its book.
    expect(fieldsToFill({ isbn: "9788189059637" }, record)).toMatchObject({
      title: "Annihilation of Caste",
      authors: ["B. R. Ambedkar"],
    });
  });

  it("never replaces a value an editor typed", () => {
    const existing = {
      title: "Annihilation of Caste (annotated)",
      subtitle: "The Annotated Critical Edition, 2nd printing",
      authors: ["Bhimrao Ramji Ambedkar"],
      publisher: "Navayana Publishing",
      publishedYear: 2015,
      firstPublishedYear: 1936,
    };

    expect(fieldsToFill(existing, record)).toEqual({});
  });

  it("leaves a list alone when the record names nobody", () => {
    expect(fieldsToFill({ authors: [] }, { authors: [] })).toEqual({});
  });

  it("fills only what the record supplies", () => {
    expect(fieldsToFill({}, { publisher: "Navayana" })).toEqual({
      publisher: "Navayana",
    });
    expect(fieldsToFill({}, {})).toEqual({});
  });

  it("never fills the summary, which is ours to write", () => {
    const withSummary = { ...record, summary: "Publisher blurb." };

    expect(fieldsToFill({ summary: "" }, withSummary)).not.toHaveProperty(
      "summary",
    );
  });

  it("drops a first publication that postdates the edition", () => {
    // A record whose first publication is later than the edition in hand
    // describes some other edition, so its year is not written at all.
    expect(
      fieldsToFill({}, { publishedYear: 2014, firstPublishedYear: 2019 }),
    ).toEqual({ publishedYear: 2014 });

    expect(
      fieldsToFill({ publishedYear: 2014 }, { firstPublishedYear: 2019 }),
    ).toEqual({});
  });

  it("keeps a first publication in the same year as the edition", () => {
    expect(
      fieldsToFill({}, { publishedYear: 2014, firstPublishedYear: 2014 }),
    ).toEqual({ publishedYear: 2014, firstPublishedYear: 2014 });
  });
});
