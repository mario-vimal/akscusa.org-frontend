import { z } from "astro/zod";
import { stringify } from "yaml";
import { describe, expect, it } from "vitest";

import { mediaImageExtensions, posterListSchema } from "~/schemas/shared";
import { readContentCollection } from "./collection";
import { parseFrontmatter } from "./frontmatter";
import { missingContentMedia } from "./media-references";

const programFields = z.object({ posters: posterListSchema("programs") });
const postersIn = (source: string) =>
  parseFrontmatter(source, programFields).posters.map((poster) => poster.src);

const entries = readContentCollection("programs", programFields);

const posterPaths = entries.flatMap((entry) =>
  entry.data.posters.map((poster) => poster.src),
);

describe("Program posters", () => {
  it("references only resolvable posters, without rejecting retained files", async () => {
    expect(await missingContentMedia(posterPaths)).toEqual([]);
  });

  it.each(["PLAIN", "QUOTE_SINGLE", "QUOTE_DOUBLE"] as const)(
    "finds every accepted poster format after a %s YAML serialization",
    (defaultStringType) => {
      const posters = mediaImageExtensions.map((extension) => ({
        src: `/media/programs/new-event/new_event.${extension}`,
        alt: "The title, date, venue and speakers from the event announcement",
      }));
      const source = `---\n${stringify({ posters }, { defaultStringType })}---\n`;

      expect(postersIn(source)).toEqual(posters.map((poster) => poster.src));
    },
  );

  it("allows an editor to leave the optional poster list empty", () => {
    expect(postersIn("---\nposters: null\n---\n")).toEqual([]);
  });

  it("does not quietly ignore an invalid selected poster", () => {
    const source = `---\n${stringify({
      posters: [
        {
          src: "/media/programs/new-event/poster.gif",
          alt: "Event announcement",
        },
      ],
    })}---\n`;
    expect(() => postersIn(source)).toThrow();
  });
});
