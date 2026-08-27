import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const collectionDirectory = `${projectRoot}cms/content/general-body-meetings`;
const mediaDirectory = `${projectRoot}cms/public/media/general-body`;

const entries = readdirSync(collectionDirectory)
  .filter((name) => name.endsWith(".md"))
  .map((name) => ({
    name,
    source: readFileSync(`${collectionDirectory}/${name}`, "utf8"),
  }));

const entryNames = entries.map((entry) => entry.name);
const sourceOf = (name: string) =>
  entries.find((candidate) => candidate.name === name)!.source;

const filesIn = (source: string) =>
  [...source.matchAll(/^\s*file:\s*"([^"]+)"\s*$/gm)].map((match) => match[1]);

const allFiles = entries.flatMap((entry) => filesIn(entry.source));

describe("General Body meetings", () => {
  it("has entries to check", () => {
    expect(entries).not.toHaveLength(0);
  });

  it.each(entryNames)("gives %s at least one paper", (name) => {
    expect(filesIn(sourceOf(name)).length).toBeGreaterThan(0);
  });

  // The old WordPress host is being retired, so a paper that still pointed at
  // it would become a dead download the day that site is switched off.
  it.each(entryNames)(
    "serves the papers for %s from this site rather than the old host",
    (name) => {
      for (const file of filesIn(sourceOf(name))) {
        expect(file).toMatch(/^\/media\/general-body\/[a-z0-9-]+\.pdf$/);
      }
    },
  );

  it.each(entryNames)("points %s at PDFs that are committed", (name) => {
    for (const file of filesIn(sourceOf(name))) {
      const onDisk = `${mediaDirectory}/${file.split("/").pop()}`;

      expect(
        existsSync(onDisk),
        `${file} is missing from cms/public/media/general-body/`,
      ).toBe(true);
    }
  });

  it("gives every meeting a distinct edition", () => {
    const editions = entries.map(
      (entry) => entry.source.match(/^edition:\s*(\d+)\s*$/m)?.[1],
    );

    expect(editions.every(Boolean)).toBe(true);
    expect(new Set(editions).size).toBe(editions.length);
  });

  it("references each PDF exactly once", () => {
    expect(new Set(allFiles).size).toBe(allFiles.length);
  });

  // An orphan would be committed weight that nothing links to.
  it("has no unused PDFs in the media folder", () => {
    const referenced = new Set(allFiles.map((file) => file.split("/").pop()));
    const orphans = readdirSync(mediaDirectory)
      .filter((name) => name.endsWith(".pdf"))
      .filter((name) => !referenced.has(name));

    expect(orphans).toEqual([]);
  });
});
