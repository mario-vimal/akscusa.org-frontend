import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

/**
 * Topics and categories are entries an editor maintains, so nothing in the Zod
 * schemas can check that a stored id still names one — a schema cannot read
 * another collection, and the whole point of the change is that the list is no
 * longer written in code.
 *
 * The CMS cannot produce a bad reference, because the relation widget only
 * offers terms that exist. What it cannot prevent is a term being deleted
 * while entries still carry it, or an id typed into a file by hand, and either
 * of those publishes a chip printing a raw slug. That is what is caught here.
 */

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const contentRoot = `${projectRoot}cms/content`;

const termIds = (vocabulary: string) =>
  new Set(
    readdirSync(`${contentRoot}/${vocabulary}`)
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.replace(/\.md$/, "")),
  );

interface Frontmatter {
  topics?: unknown;
  category?: unknown;
}

/** Every entry in the CMS content tree, with its frontmatter parsed. */
const entries = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((collection) =>
    readdirSync(`${contentRoot}/${collection.name}`)
      .filter((name) => name.endsWith(".md"))
      .map((name) => {
        const path = `${contentRoot}/${collection.name}/${name}`;
        const source = readFileSync(path, "utf8");
        const match = /^---\n([\s\S]*?)\n---/.exec(source);

        return {
          path: `cms/content/${collection.name}/${name}`,
          data: (match ? (parse(match[1]) as Frontmatter) : {}) ?? {},
        };
      }),
  );

describe("Editor-maintained vocabularies", () => {
  const topics = termIds("topics");
  const categories = termIds("categories");

  it("has terms to file entries under", () => {
    expect(topics.size).toBeGreaterThan(0);
    expect(categories.size).toBeGreaterThan(0);
  });

  it("gives every term a label", () => {
    for (const vocabulary of ["topics", "categories"]) {
      for (const id of termIds(vocabulary)) {
        const source = readFileSync(
          `${contentRoot}/${vocabulary}/${id}.md`,
          "utf8",
        );
        const match = /^---\n([\s\S]*?)\n---/.exec(source);
        const data = parse(match?.[1] ?? "") as { label?: unknown };

        expect(data.label, `${vocabulary}/${id} has no label`).toBeTruthy();
      }
    }
  });

  it("files every entry under topics that exist", () => {
    for (const entry of entries) {
      const stored = Array.isArray(entry.data.topics) ? entry.data.topics : [];

      for (const topic of stored) {
        expect(
          topics.has(String(topic)),
          `${entry.path} names a topic that no longer exists: ${String(topic)}`,
        ).toBe(true);
      }
    }
  });

  it("files every article under a category that exists", () => {
    for (const entry of entries.filter((candidate) =>
      candidate.path.startsWith("cms/content/articles/"),
    )) {
      const { category } = entry.data;

      expect(typeof category, `${entry.path} has no category`).toBe("string");
      expect(
        categories.has(String(category)),
        `${entry.path} names a category that no longer exists: ${String(category)}`,
      ).toBe(true);
    }
  });
});
