import { z } from "astro/zod";
import { describe, expect, it, vi } from "vitest";

import { readContentCollection } from "./collection";
import { missingContentMedia } from "./media-references";

const schemas = vi.hoisted(() => new Map<string, unknown>());
vi.mock("astro:content", () => ({
  defineCollection: (definition: {
    loader: { name: string };
    schema: unknown;
  }) => {
    schemas.set(definition.loader.name, definition.schema);
    return definition;
  },
}));
vi.mock("astro/loaders", () => ({
  glob: ({ base }: { base: string }) => ({ name: base, load: async () => {} }),
}));

import "~/schemas/artwork";
import "~/schemas/books";
import "~/schemas/editorial";
import "~/schemas/organization";
import "~/schemas/taxonomy";

function referencedMedia(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(referencedMedia);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => {
    if (
      ["src", "cover", "file", "url"].includes(key) &&
      typeof item === "string" &&
      item.startsWith("/media/")
    ) {
      return [item];
    }
    return referencedMedia(item);
  });
}

describe("current CMS records and their static media", () => {
  it("loads the schemas for all 14 CMS collections", () => {
    expect(schemas.size).toBe(14);
  });

  it.each([...schemas])(
    "validates nested records and referenced media in %s",
    async (base, schema) => {
      if (!(schema instanceof z.ZodType))
        throw new Error(`Expected a static schema for ${base}`);
      const folder = base.replace(/^\.\/cms\/content\//, "");
      expect(folder).not.toContain("/");
      const entries = readContentCollection(folder, schema);
      expect(new Set(entries.map(({ id }) => id)).size).toBe(entries.length);
      const media = entries.flatMap(({ data }) => referencedMedia(data));
      expect(await missingContentMedia(media)).toEqual([]);
    },
  );
});
