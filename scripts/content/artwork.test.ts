import { z } from "astro/zod";
import { describe, expect, it } from "vitest";

import {
  mediaImagePath,
  optionalCmsField,
  optionalCmsList,
} from "~/schemas/shared";
import { readContentCollection } from "./collection";
import { missingContentMedia } from "./media-references";

/**
 * Panels are committed beside their entry and served from `/media/`.
 * These checks fail the build rather than let a comic degrade to a row
 * of broken images, and they hold the accessibility floor: a panel with no
 * description is not publishable, however good the drawing is.
 */

const artworkFields = z.object({
  title: z.string(),
  panels: z
    .array(
      z.object({
        src: z.string(),
        alt: z.string(),
        transcript: optionalCmsField(z.string()),
      }),
    )
    .min(1),
  credits: optionalCmsList(z.array(z.object({ name: z.string() })).default([])),
});

const readCollection = (folder: string) =>
  readContentCollection(folder, artworkFields);

const collections = [
  { folder: "comics", media: "comics", requiresCredit: true },
  {
    folder: "toolkit-scenarios",
    media: "toolkit-scenarios",
    requiresCredit: false,
  },
] as const;

describe.each(collections)("$folder panels", ({ folder, media }) => {
  const entries = readCollection(folder);
  const panels = entries.flatMap((entry) => entry.data.panels ?? []);
  it("serves every panel from this site", () => {
    for (const panel of panels) {
      expect(mediaImagePath(media).safeParse(panel.src).success).toBe(true);
    }
  });

  it("references only resolvable panels, without rejecting retained files", async () => {
    expect(await missingContentMedia(panels.map((panel) => panel.src))).toEqual(
      [],
    );
  });

  // A panel is a picture with words baked into it. Without a description of
  // the drawing and a transcript of the lettering, none of it reaches a screen
  // reader, a translation, or a search result.
  it("describes every panel", () => {
    for (const panel of panels) {
      expect(
        panel.alt?.trim(),
        `${panel.src} has no alternative text`,
      ).toBeTruthy();
    }
  });

  // A wordless panel is legitimate, but a whole entry with no transcript at all
  // means the lettering was never written down, and the argument the artwork
  // makes reaches nobody who cannot see it.
  it("transcribes the words drawn in each entry", () => {
    for (const entry of entries) {
      const transcribed = (entry.data.panels ?? []).filter((panel) =>
        panel.transcript?.trim(),
      );

      expect(
        transcribed.length,
        `${entry.name} transcribes none of its panels`,
      ).toBeGreaterThan(0);
    }
  });

  it("never repeats the transcript as the alternative text", () => {
    for (const panel of panels) {
      if (!panel.transcript) continue;

      expect(
        panel.alt.trim(),
        `${panel.src} repeats its transcript as alternative text`,
      ).not.toBe(panel.transcript.trim());
    }
  });
});

describe("comics", () => {
  const entries = readCollection("comics");

  // The point of the collection is to publish other people's work, so an
  // uncredited comic is a bug rather than an oversight.
  it("credits every comic", () => {
    for (const entry of entries) {
      expect(
        entry.data.credits?.length ?? 0,
        `${entry.name} names nobody`,
      ).toBeGreaterThan(0);

      for (const credit of entry.data.credits ?? []) {
        expect(credit.name?.trim()).toBeTruthy();
      }
    }
  });
});
