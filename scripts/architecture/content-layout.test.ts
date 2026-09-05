import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

const root = "cms/content";
const taxonomy = new Set(["topics", "categories"]);
const mediaReference = /(?<![A-Za-z0-9:/])\/media\/[^\s<>"')\]]+/g;

describe("entry-owned media", () => {
  it("keeps each media-owning record and its referenced files together", () => {
    const files = readdirSync(root, {
      recursive: true,
      encoding: "utf8",
    }).filter((file) => file.endsWith(".md"));
    let checked = 0;

    for (const relative of files) {
      const [collection, slug, filename, ...extra] = relative.split("/");
      if (taxonomy.has(collection)) continue;
      expect(filename, relative).toBe("index.md");
      expect(extra, relative).toEqual([]);
      const file = join(root, relative);
      const text = readFileSync(file, "utf8");
      const prefix = `/media/${collection}/${slug}/`;

      for (const [reference] of text.matchAll(mediaReference)) {
        const url = new URL(reference, "https://content.invalid");
        const path = decodeURIComponent(url.pathname);
        if (path.startsWith("/media/shared/")) {
          expect(
            lstatSync(join("cms/public", path)).isFile(),
            `${file}: ${reference}`,
          ).toBe(true);
          continue;
        }
        expect(path.startsWith(prefix), `${file}: ${reference}`).toBe(true);
        const asset = join(dirname(file), path.slice(prefix.length));
        expect(lstatSync(asset).isFile(), `${file}: ${reference}`).toBe(true);
      }
      checked++;
    }

    expect(checked).toBeGreaterThan(0);
  });
});
