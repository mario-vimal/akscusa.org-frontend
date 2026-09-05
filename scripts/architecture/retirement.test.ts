import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const roots = ["app/content/pages", "cms/content"];
const retiredMedia =
  /https?:\/\/(?:www\.)?akscusa\.org\/(?:wp-content|wp-json|wp-admin)(?:\/|$)|https?:\/\/i\d\.wp\.com\/akscusa\.org\//i;
const retiredApplication = /akscusa\.squarespace\.com/i;
const obsoleteProvenance = new Set([
  "akscusa.org",
  "www.akscusa.org",
  "akscusa.squarespace.com",
]);

describe("retired application references", () => {
  it("keeps obsolete media and provenance out of all content, including drafts", () => {
    for (const root of roots) {
      const files = readdirSync(root, {
        recursive: true,
        encoding: "utf8",
      }).filter((file) => file.endsWith(".md"));
      for (const relative of files) {
        const file = join(root, relative);
        const text = readFileSync(file, "utf8");
        expect(text, file).not.toMatch(retiredMedia);
        expect(text, file).not.toMatch(retiredApplication);

        const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
        if (!match) throw new Error(`No frontmatter in ${file}.`);
        const data: unknown = parse(match[1]);
        if (!data || typeof data !== "object" || !("sourceUrl" in data)) {
          continue;
        }
        if (typeof data.sourceUrl === "string" && data.sourceUrl !== "") {
          expect(
            obsoleteProvenance.has(new URL(data.sourceUrl).hostname),
            `${file}: use a genuine external source, not retired-site provenance`,
          ).toBe(false);
        }
      }
    }
  });
});
