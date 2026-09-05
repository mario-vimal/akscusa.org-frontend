import { describe, expect, it } from "vitest";

import {
  facetSet,
  inFacetSet,
  logFacets,
  logStatusLabel,
  matchesSearch,
  searchTerms,
  type FilterableEntry,
} from "./search";

const author = (slug: string, name: string) => ({ slug, name });

const entry = (
  key: string,
  title: string,
  authors: { slug: string; name: string }[],
  years: number[],
  readsArticles = false,
): FilterableEntry => ({
  key,
  title,
  authors,
  years,
  bookState: readsArticles ? "none" : "published",
});

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

  it("finds a session by ISBN and by year", () => {
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

describe("logStatusLabel", () => {
  it("never states a total, because the record is not a census", () => {
    expect(logStatusLabel(11, 11)).toBe("Newest first.");
    expect(logStatusLabel(1, 1)).toBe("Newest first.");
  });

  it("counts the matches once a query narrows the list", () => {
    expect(logStatusLabel(3, 11)).toBe("3 readings match.");
    expect(logStatusLabel(1, 11)).toBe("1 reading matches.");
  });

  it("says so when nothing matches", () => {
    expect(logStatusLabel(0, 11)).toBe("No readings match those filters.");
  });
});

describe("logFacets", () => {
  const entries = [
    entry(
      "the-will-to-change",
      "The Will to Change",
      [author("bell-hooks", "bell hooks")],
      [2025],
    ),
    entry(
      "annihilation-of-caste",
      "Annihilation of Caste",
      [author("dr-b-r-ambedkar", "Dr. B. R. Ambedkar")],
      [2025, 2020],
    ),
    entry(
      "riddles-in-hinduism",
      "Riddles in Hinduism",
      [author("dr-b-r-ambedkar", "Dr. B. R. Ambedkar")],
      [2020],
    ),
    entry("palestine", "Palestine – A reading list", [], [2024], true),
  ];

  it("lists the books by title, leaving out an entry that read no book", () => {
    expect(logFacets(entries).books).toEqual([
      { value: "annihilation-of-caste", label: "Annihilation of Caste" },
      { value: "riddles-in-hinduism", label: "Riddles in Hinduism" },
      { value: "the-will-to-change", label: "The Will to Change" },
    ]);
  });

  // Two books by one author are one option. The dropdown is keyed by the
  // author's slug rather than by the name printed on either book, which is
  // what stops two spellings of one name becoming two half-empty filters.
  it("lists each author once, alphabetically", () => {
    expect(logFacets(entries).authors).toEqual([
      { value: "bell-hooks", label: "bell hooks" },
      { value: "dr-b-r-ambedkar", label: "Dr. B. R. Ambedkar" },
    ]);
  });

  it("lists each year once, newest first", () => {
    expect(logFacets(entries).years.map((option) => option.value)).toEqual([
      "2025",
      "2024",
      "2020",
    ]);
  });

  it("offers nothing for an empty log", () => {
    expect(logFacets([])).toEqual({ books: [], authors: [], years: [] });
  });

  it("does not offer an unpublished book or its credited authors as facets", () => {
    const unpublished: FilterableEntry = {
      key: "unpublished-session",
      title: "An announced session",
      authors: [author("withheld-author", "Withheld author")],
      years: [2026],
      bookState: "unpublished",
    };
    expect(logFacets([unpublished])).toEqual({
      books: [],
      authors: [],
      years: [{ value: "2026", label: "2026" }],
    });
  });
});

describe("facetSet", () => {
  it("delimits both ends so one value cannot match inside another", () => {
    expect(facetSet([2020, 2025])).toBe("|2020|2025|");
    expect(inFacetSet("2020", facetSet([12020]))).toBe(false);
    expect(inFacetSet("2020", facetSet([2020, 2025]))).toBe(true);
  });

  it("is empty for a row that belongs to nothing", () => {
    expect(facetSet([])).toBe("");
    expect(inFacetSet("bell-hooks", facetSet([]))).toBe(false);
  });

  it("drops a delimiter inside a value rather than splitting on it", () => {
    expect(facetSet(["ambedkar | omvedt"])).toBe("|ambedkar  omvedt|");
  });
});

describe("inFacetSet", () => {
  it("treats an empty choice as no filter at all", () => {
    expect(inFacetSet("", facetSet([2020]))).toBe(true);
    expect(inFacetSet("", "")).toBe(true);
  });

  it("matches a single-valued facet such as a book exactly", () => {
    const book = facetSet(["the-will-to-change"]);
    expect(inFacetSet("the-will-to-change", book)).toBe(true);
    expect(inFacetSet("caste-pride", book)).toBe(false);
    // A book id that contains another must not be matched by it.
    expect(inFacetSet("change", book)).toBe(false);
  });
});
