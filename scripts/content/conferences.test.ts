import { z } from "astro/zod";
import { describe, expect, it } from "vitest";

import { mediaImagePath } from "~/schemas/shared";
import { readContentCollection } from "./collection";
import { missingContentMedia } from "./media-references";

const entries = readContentCollection("conferences", z.object({}));
const posterPaths = entries.flatMap(({ source }) =>
  [...source.matchAll(/!\[[^\]]*\]\((\/media\/[^\s)]+)/g)].map(
    (match) => match[1],
  ),
);

describe("Conference media", () => {
  it("uses supported public image paths for posters", () => {
    for (const poster of posterPaths) {
      expect(mediaImagePath("conferences").safeParse(poster).success).toBe(
        true,
      );
    }
  });

  it("resolves referenced posters without rejecting retained assets", async () => {
    expect(await missingContentMedia(posterPaths)).toEqual([]);
  });
});
