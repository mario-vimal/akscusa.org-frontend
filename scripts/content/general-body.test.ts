import { z } from "astro/zod";
import { stringify } from "yaml";
import { describe, expect, it } from "vitest";

import { mediaFilePath } from "~/schemas/shared";
import { readContentCollection } from "./collection";
import { parseFrontmatter } from "./frontmatter";
import { missingContentMedia } from "./media-references";

const meetingFields = z.object({
  edition: z.number().int().positive(),
  papers: z
    .array(z.object({ file: mediaFilePath("general-body-meetings", ["pdf"]) }))
    .min(1),
});

const meetingIn = (source: string) => parseFrontmatter(source, meetingFields);

const entries = readContentCollection("general-body-meetings", meetingFields);

const filesIn = (source: string) =>
  meetingIn(source).papers.map((paper) => paper.file);

const allFiles = entries.flatMap((entry) =>
  entry.data.papers.map((paper) => paper.file),
);

describe("General Body meetings", () => {
  it("references only resolvable PDFs, without rejecting retained files", async () => {
    expect(await missingContentMedia(allFiles)).toEqual([]);
  });

  it("gives every meeting a distinct edition", () => {
    const editions = entries.map((entry) => entry.data.edition);

    expect(new Set(editions).size).toBe(editions.length);
  });

  it.each(["PLAIN", "QUOTE_SINGLE", "QUOTE_DOUBLE"] as const)(
    "finds a new meeting's paper after a %s YAML serialization",
    (defaultStringType) => {
      const data = {
        edition: 12,
        papers: [
          {
            file: "/media/general-body-meetings/meeting-2030/annual_report-2030.pdf",
          },
        ],
      };
      const source = `---\n${stringify(data, { defaultStringType })}---\n`;

      expect(filesIn(source)).toEqual([data.papers[0].file]);
      expect(meetingIn(source).edition).toBe(12);
    },
  );

  it("does not quietly ignore malformed or non-PDF paper fields", () => {
    for (const file of [
      "https://example.com/report.pdf",
      "/media/general-body-meetings/meeting-2030/scan.png",
    ]) {
      const source = `---\n${stringify({ edition: 12, papers: [{ file }] })}---\n`;
      expect(() => filesIn(source)).toThrow();
    }
  });
});
