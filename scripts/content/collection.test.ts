import { z } from "astro/zod";
import { describe, expect, it, vi } from "vitest";

import { readContentCollection } from "./collection";

const files = vi.hoisted(() => ({
  globSync: vi.fn(() => ["term.md", "author-name/index.md"]),
  readFileSync: vi.fn(() => "---\ntitle: A prospective entry\n---\n\nBody.\n"),
}));
vi.mock("node:fs", () => files);

describe("CMS record discovery", () => {
  it("reads both flat vocabulary files and nested entry bundles", () => {
    const entries = readContentCollection(
      "example",
      z.object({ title: z.string() }),
    );

    expect(files.globSync).toHaveBeenCalledWith(
      "**/*.md",
      expect.objectContaining({
        cwd: expect.stringContaining("cms/content/example"),
      }),
    );
    expect(entries.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "author-name", name: "author-name/index.md" },
      { id: "term", name: "term.md" },
    ]);
    expect(
      entries.every((entry) => entry.data.title === "A prospective entry"),
    ).toBe(true);
    expect(entries.every((entry) => entry.source.includes("Body."))).toBe(true);
  });
});
