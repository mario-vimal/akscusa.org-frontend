import { describe, expect, it } from "vitest";

import { resolvePublishedReferences } from "./references";

describe.each(["author", "speaker"])("ordered %s references", (kind) => {
  const first = { id: "a", name: "Alphabetically first" };
  const last = { id: "z", name: "Credited first" };
  const withheld = { id: "draft", name: "Not published" };
  const known = new Set([first.id, last.id, withheld.id]);
  const published = new Map([first, last].map((entry) => [entry.id, entry]));
  const missing = (id: string) => new Error(`Missing ${kind} "${id}".`);

  it("preserves the explicit credit order while omitting unpublished targets", () => {
    expect(
      resolvePublishedReferences(
        ["z", "draft", "a"],
        known,
        published,
        missing,
      ),
    ).toEqual([last, first]);
  });

  it("still reports a genuinely missing target even beside a draft", () => {
    expect(() =>
      resolvePublishedReferences(
        ["draft", "missing"],
        known,
        published,
        missing,
      ),
    ).toThrow(`Missing ${kind} "missing".`);
  });

  it("handles empty collections and known but wholly unpublished references", () => {
    expect(
      resolvePublishedReferences([], new Set(), new Map(), missing),
    ).toEqual([]);
    expect(
      resolvePublishedReferences(["draft"], known, new Map(), missing),
    ).toEqual([]);
    expect(() =>
      resolvePublishedReferences(["missing"], new Set(), new Map(), missing),
    ).toThrow(`Missing ${kind} "missing".`);
  });

  it("can include draft targets when the canonical loader publishes them for preview", () => {
    const preview = new Map([...published, [withheld.id, withheld]]);
    expect(
      resolvePublishedReferences(["z", "draft", "a"], known, preview, missing),
    ).toEqual([last, withheld, first]);
  });
});
