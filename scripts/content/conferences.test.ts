import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const collectionDirectory = `${projectRoot}cms/content/conferences`;
const mediaDirectory = `${projectRoot}cms/public/media/conferences`;

const posterPaths = readdirSync(collectionDirectory)
  .filter((name) => name.endsWith(".md"))
  .flatMap((name) => {
    const source = readFileSync(`${collectionDirectory}/${name}`, "utf8");
    return [
      ...source.matchAll(/\]\((\/media\/conferences\/[^)]+\.jpg)\)/g),
    ].map((match) => match[1]);
  });

describe("Conference media", () => {
  it("references only committed posters", () => {
    for (const poster of posterPaths) {
      expect(poster).toMatch(/^\/media\/conferences\/[a-z0-9-]+\.jpg$/);
      expect(existsSync(`${projectRoot}cms/public${poster}`)).toBe(true);
    }
  });

  it("has no unused posters", () => {
    const referenced = new Set(
      posterPaths.map((poster) => poster.split("/").pop()),
    );
    const orphans = readdirSync(mediaDirectory)
      .filter((name) => name.endsWith(".jpg"))
      .filter((name) => !referenced.has(name));

    expect(orphans).toEqual([]);
  });
});
