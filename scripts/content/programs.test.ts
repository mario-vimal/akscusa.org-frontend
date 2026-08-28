import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const collectionDirectory = `${projectRoot}cms/content/programs`;
const mediaDirectory = `${projectRoot}cms/public/media/programs`;

const entries = readdirSync(collectionDirectory)
  .filter((name) => name.endsWith(".md"))
  .map((name) => ({
    name,
    source: readFileSync(`${collectionDirectory}/${name}`, "utf8"),
  }));

const posterPaths = entries.flatMap((entry) =>
  [...entry.source.matchAll(/^\s*-\s+src:\s*"([^"]+)"\s*$/gm)].map(
    (match) => match[1],
  ),
);

describe("Program posters", () => {
  it("serves every poster from this site", () => {
    for (const poster of posterPaths) {
      expect(poster).toMatch(/^\/media\/programs\/[a-z0-9-]+\.jpg$/);
    }
  });

  it("references only committed poster files", () => {
    for (const poster of posterPaths) {
      const onDisk = `${mediaDirectory}/${poster.split("/").pop()}`;

      expect(
        existsSync(onDisk),
        `${poster} is missing from cms/public/media/programs/`,
      ).toBe(true);
    }
  });

  it("has no unused poster files", () => {
    const referenced = new Set(
      posterPaths.map((poster) => poster.split("/").pop()),
    );
    const orphans = readdirSync(mediaDirectory)
      .filter((name) => name.endsWith(".jpg"))
      .filter((name) => !referenced.has(name));

    expect(orphans).toEqual([]);
  });
});
