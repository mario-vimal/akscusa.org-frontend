import { describe, expect, it } from "vitest";

import { readFrontmatter, writeFrontmatterFields } from "./frontmatter.ts";

/** A book as Sveltia writes one: quoted strings, a list, no blank lines. */
const entry = `---
title: "Buffalo Nationalism"
authors:
  - "Kancha Ilaiah"
isbn: "9788185604695"
summary: "A critique of Hindu spiritual fascism."
topics:
  - "caste-discrimination"
draft: false
---

Body copy, which is not frontmatter.
`;

describe("readFrontmatter", () => {
  it("parses the mapping between the delimiters", () => {
    const { data } = readFrontmatter(entry, "buffalo-nationalism.md");

    expect(data.title).toBe("Buffalo Nationalism");
    expect(data.isbn).toBe("9788185604695");
    expect(data.authors).toEqual(["Kancha Ilaiah"]);
  });

  it("names the file when there is no frontmatter", () => {
    expect(() => readFrontmatter("Just a body.", "stray.md")).toThrow(
      /stray\.md has no frontmatter/,
    );
  });

  it("rejects frontmatter that is not a mapping", () => {
    expect(() =>
      readFrontmatter("---\n- one\n- two\n---\n", "list.md"),
    ).toThrow(/not a mapping/);
  });
});

describe("writeFrontmatterFields", () => {
  it("inserts each field where the schema puts it", () => {
    const filled = writeFrontmatterFields(entry, {
      subtitle: "Caste, Class and Ideology",
      publisher: "Sage",
      publishedYear: 2004,
    });

    expect(filled).toBe(`---
title: "Buffalo Nationalism"
subtitle: "Caste, Class and Ideology"
authors:
  - "Kancha Ilaiah"
isbn: "9788185604695"
publisher: "Sage"
publishedYear: 2004
summary: "A critique of Hindu spiritual fascism."
topics:
  - "caste-discrimination"
draft: false
---

Body copy, which is not frontmatter.
`);
  });

  it("leaves the body and every other field untouched", () => {
    const filled = writeFrontmatterFields(entry, { publisher: "Sage" });

    expect(filled).toContain("\n\nBody copy, which is not frontmatter.\n");
    expect(readFrontmatter(filled, "x.md").data).toMatchObject({
      title: "Buffalo Nationalism",
      authors: ["Kancha Ilaiah"],
      draft: false,
    });
  });

  it("replaces the value on a key that is already there", () => {
    const blank = entry.replace(
      'isbn: "9788185604695"',
      'publisher: ""\nisbn: "9788185604695"',
    );

    expect(writeFrontmatterFields(blank, { publisher: "Sage" })).toContain(
      'publisher: "Sage"\nisbn:',
    );
  });

  it("escapes a value that would otherwise break the YAML", () => {
    const filled = writeFrontmatterFields(entry, {
      subtitle: 'Caste: a "reader"',
    });

    expect(readFrontmatter(filled, "x.md").data.subtitle).toBe(
      'Caste: a "reader"',
    );
  });

  it("clears the anchor's own list before inserting after it", () => {
    // `subtitle` follows `title`, but `publishedYear` follows `publisher`,
    // which may be absent; the field then goes to the end rather than into
    // the middle of the list above it.
    const filled = writeFrontmatterFields(entry, { firstPublishedYear: 1996 });

    expect(readFrontmatter(filled, "x.md").data).toMatchObject({
      firstPublishedYear: 1996,
      topics: ["caste-discrimination"],
      draft: false,
    });
  });

  it("writes a list as the block sequence Sveltia writes", () => {
    const blank = entry.replace('authors:\n  - "Kancha Ilaiah"', "authors: []");

    expect(
      writeFrontmatterFields(blank, {
        authors: ["Kancha Ilaiah Shepherd", "Gaddar"],
      }),
    ).toContain('authors:\n  - "Kancha Ilaiah Shepherd"\n  - "Gaddar"\nisbn:');
  });

  it("takes the old items with it when it replaces a list", () => {
    const filled = writeFrontmatterFields(entry, { authors: ["Periyar"] });

    expect(readFrontmatter(filled, "x.md").data.authors).toEqual(["Periyar"]);
    expect(filled).not.toContain("Kancha Ilaiah");
  });

  it("puts a title the entry never stated at the top", () => {
    const untitled = entry.replace('title: "Buffalo Nationalism"\n', "");

    expect(
      writeFrontmatterFields(untitled, { title: "Buffalo Nationalism" }),
    ).toContain('---\ntitle: "Buffalo Nationalism"\nauthors:');
  });

  it("falls back to the nearest earlier field the entry does have", () => {
    // `publisher` follows `isbn`, and `publishedYear` follows `publisher`,
    // which is absent here; the year lands after the ISBN rather than at the
    // end of the block.
    expect(writeFrontmatterFields(entry, { publishedYear: 2004 })).toContain(
      'isbn: "9788185604695"\npublishedYear: 2004\nsummary:',
    );
  });

  it("refuses a file with no frontmatter to write into", () => {
    expect(() =>
      writeFrontmatterFields("Just a body.", { publisher: "Sage" }),
    ).toThrow(/no frontmatter/);
  });
});
