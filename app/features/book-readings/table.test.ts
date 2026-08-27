import { describe, expect, it } from "vitest";

import {
  compareRows,
  matchesSearch,
  nextSortState,
  resultLabel,
  searchTerms,
  sortRows,
  type SortableRow,
} from "./table";

const row = (
  date: string,
  title: string,
  book: string,
  search = "",
): SortableRow => ({ date, title, book, search });

const riddles1 = row(
  "2020-02-23T23:00:00.000Z",
  "riddles in hinduism: riddles 1 – 8",
  "riddles in hinduism",
);
const riddles21 = row(
  "2020-04-26T22:00:00.000Z",
  "riddles in hinduism: riddles 21 – 24",
  "riddles in hinduism",
);
const annihilation = row(
  "2020-06-07T22:00:00.000Z",
  "annihilation of caste, continued",
  "annihilation of caste",
);
const palestine = row(
  "2024-01-27T23:00:00.000Z",
  "palestine – a reading list",
  "",
);

const all = [riddles1, riddles21, annihilation, palestine];

describe("searchTerms", () => {
  it("splits on whitespace and lowercases", () => {
    expect(searchTerms("  Riddles   Hinduism ")).toEqual([
      ["riddles"],
      ["hinduism"],
    ]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchTerms("   ")).toEqual([]);
  });

  it("offers a hyphen-free alternative for a hyphenated term", () => {
    expect(searchTerms("978-81-89059-63-7")).toEqual([
      ["978-81-89059-63-7", "9788189059637"],
    ]);
  });
});

describe("matchesSearch", () => {
  const haystack = "annihilation of caste b. r. ambedkar 9788189059637 2020";

  it("requires every term to match", () => {
    expect(matchesSearch(haystack, searchTerms("caste ambedkar"))).toBe(true);
    expect(matchesSearch(haystack, searchTerms("caste periyar"))).toBe(false);
  });

  it("matches everything when there are no terms", () => {
    expect(matchesSearch(haystack, [])).toBe(true);
  });

  it("finds a reading by ISBN and by year", () => {
    expect(matchesSearch(haystack, searchTerms("9788189059637"))).toBe(true);
    expect(matchesSearch(haystack, searchTerms("2020"))).toBe(true);
  });

  it("finds an ISBN typed with the hyphens printed on the book", () => {
    expect(matchesSearch(haystack, searchTerms("978-81-89059-63-7"))).toBe(
      true,
    );
  });

  it("still matches a genuinely hyphenated word as written", () => {
    expect(
      matchesSearch(
        "caste discrimination anti-caste work",
        searchTerms("anti-caste"),
      ),
    ).toBe(true);
  });
});

describe("sortRows", () => {
  it("puts the newest reading first by default", () => {
    const sorted = sortRows(all, { key: "date", ascending: false });
    expect(sorted.map((entry) => entry.date)).toEqual([
      palestine.date,
      annihilation.date,
      riddles21.date,
      riddles1.date,
    ]);
  });

  it("reverses to oldest first", () => {
    const sorted = sortRows(all, { key: "date", ascending: true });
    expect(sorted[0]).toBe(riddles1);
    expect(sorted.at(-1)).toBe(palestine);
  });

  it("sorts titles alphabetically", () => {
    const sorted = sortRows(all, { key: "title", ascending: true });
    expect(sorted[0]).toBe(annihilation);
  });

  it("keeps a reading with no book last in both directions", () => {
    for (const ascending of [true, false]) {
      const sorted = sortRows(all, { key: "book", ascending });
      expect(sorted.at(-1)).toBe(palestine);
    }
  });

  it("does not mutate the rows it was given", () => {
    const input = [...all];
    sortRows(input, { key: "title", ascending: true });
    expect(input).toEqual(all);
  });
});

describe("compareRows", () => {
  it("treats two books with the same title as equal", () => {
    expect(
      compareRows(riddles1, riddles21, { key: "book", ascending: true }),
    ).toBe(0);
  });
});

describe("nextSortState", () => {
  it("flips direction when the active column is clicked again", () => {
    expect(nextSortState({ key: "date", ascending: false }, "date")).toEqual({
      key: "date",
      ascending: true,
    });
  });

  it("starts a text column A to Z and the date column newest first", () => {
    expect(nextSortState({ key: "date", ascending: false }, "book")).toEqual({
      key: "book",
      ascending: true,
    });
    expect(nextSortState({ key: "book", ascending: true }, "date")).toEqual({
      key: "date",
      ascending: false,
    });
  });
});

describe("resultLabel", () => {
  it("reports the full set and a filtered set differently", () => {
    expect(resultLabel(6, 6)).toBe("Showing all 6 readings.");
    expect(resultLabel(2, 6)).toBe("Showing 2 of 6 readings.");
    expect(resultLabel(1, 1)).toBe("Showing all 1 reading.");
  });
});
