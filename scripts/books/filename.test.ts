import { describe, expect, it } from "vitest";

import { renameTarget, slugify } from "./filename.ts";

describe("slugify", () => {
  it("names a file the way the CMS would have from the same title", () => {
    expect(slugify("Annihilation of Caste")).toBe("annihilation-of-caste");
  });

  it("drops punctuation rather than encoding it into the URL", () => {
    expect(slugify("Why Were Women Enslaved?")).toBe("why-were-women-enslaved");
    expect(slugify("Caste: The Origins of Our Discontents")).toBe(
      "caste-the-origins-of-our-discontents",
    );
  });

  it("folds accents instead of dropping the letters under them", () => {
    expect(slugify("Périyar's Café")).toBe("periyar-s-cafe");
  });

  it("leaves no leading, trailing or doubled separator", () => {
    expect(slugify("  ¡A Book!  ")).toBe("a-book");
  });
});

describe("renameTarget", () => {
  it("moves an entry to the file its title names", () => {
    expect(
      renameTarget("cms/content/books/a1b2c3d4.md", "Buffalo Nationalism"),
    ).toBe("cms/content/books/buffalo-nationalism.md");
  });

  it("leaves an entry already named after its title alone", () => {
    expect(
      renameTarget(
        "cms/content/books/buffalo-nationalism.md",
        "Buffalo Nationalism",
      ),
    ).toBeUndefined();
  });

  // A title this transliteration cannot reduce to ASCII would otherwise
  // rename the entry to nothing but its extension.
  it("keeps the current name when the title slugs to nothing", () => {
    expect(
      renameTarget("cms/content/books/a1b2c3d4.md", "பெண்"),
    ).toBeUndefined();
  });
});
