import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

/**
 * Panels are committed to this repository and served from `/media/`, so a
 * published comic keeps working once the Squarespace and WordPress hosts are
 * retired. These checks fail the build rather than let a comic degrade to a row
 * of broken images, and they hold the accessibility floor: a panel with no
 * description is not publishable, however good the drawing is.
 */

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

interface Panel {
  src: string;
  alt: string;
  transcript?: string;
}

interface Credit {
  name: string;
}

interface Artwork {
  title: string;
  panels: Panel[];
  credits?: Credit[];
}

const readCollection = (folder: string) => {
  const directory = `${projectRoot}cms/content/${folder}`;

  return readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const source = readFileSync(`${directory}/${name}`, "utf8");
      const frontmatter = /^---\n([\s\S]*?)\n---/.exec(source)?.[1];

      expect(frontmatter, `${name} has no frontmatter`).toBeDefined();

      return { name, data: parse(frontmatter!) as Artwork };
    });
};

const collections = [
  { folder: "comics", media: "comics", requiresCredit: true },
  {
    folder: "toolkit-scenarios",
    media: "anti-caste-toolkit",
    requiresCredit: false,
  },
] as const;

describe.each(collections)("$folder panels", ({ folder, media }) => {
  const entries = readCollection(folder);
  const mediaDirectory = `${projectRoot}cms/public/media/${media}`;
  const panels = entries.flatMap((entry) => entry.data.panels ?? []);
  it("publishes at least one entry", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(panels.length).toBeGreaterThan(0);
  });

  it("serves every panel from this site", () => {
    for (const panel of panels) {
      expect(panel.src).toMatch(
        new RegExp(`^/media/${media}/[a-z0-9-]+\\.(png|jpe?g|webp)$`),
      );
    }
  });

  it("references only committed panel files", () => {
    for (const panel of panels) {
      const onDisk = `${mediaDirectory}/${panel.src.split("/").pop()}`;

      expect(
        existsSync(onDisk),
        `${panel.src} is missing from cms/public/media/${media}/`,
      ).toBe(true);
    }
  });

  it("has no unused panel files", () => {
    const referenced = new Set(
      panels.map((panel) => panel.src.split("/").pop()),
    );
    const orphans = readdirSync(mediaDirectory).filter(
      (name) => !referenced.has(name),
    );

    expect(orphans).toEqual([]);
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
