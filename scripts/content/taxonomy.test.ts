import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { z } from "astro/zod";
import { describe, expect, it } from "vitest";

import { readContentCollection } from "./collection";

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

const frontmatterFields = z.object({
  topics: z.unknown().optional(),
  category: z.unknown().optional(),
  label: z.unknown().optional(),
});

/** Every entry in the CMS content tree, with its frontmatter parsed. */
const entries = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((collection) =>
    readContentCollection(collection.name, frontmatterFields),
  );

const vocabularyEntries = (name: string) =>
  entries.filter((entry) => entry.path.startsWith(`cms/content/${name}/`));
const termIds = (name: string) =>
  new Set(vocabularyEntries(name).map((entry) => entry.id));

describe("Editor-maintained vocabularies", () => {
  const topics = termIds("topics");
  const categories = termIds("categories");

  it("has terms to file entries under", () => {
    expect(topics.size).toBeGreaterThan(0);
    expect(categories.size).toBeGreaterThan(0);
  });

  it("gives every term a label", () => {
    for (const vocabulary of ["topics", "categories"]) {
      for (const entry of vocabularyEntries(vocabulary)) {
        expect(entry.data.label, `${entry.path} has no label`).toBeTruthy();
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
