import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveCmsDirectory } from "./dev-routing";

const escapeDir = fileURLToPath(
  new URL("../../.tmp-cms-routing/", import.meta.url),
);

describe("CMS dev routing", () => {
  beforeAll(() => {
    mkdirSync(escapeDir, { recursive: true });
    writeFileSync(`${escapeDir}index.html`, "outside the public directory");
  });

  afterAll(() => {
    rmSync(escapeDir, { force: true, recursive: true });
  });

  it("serves the admin directory from its index file", () => {
    expect(resolveCmsDirectory("/admin/")).toEqual({
      type: "rewrite",
      url: "/admin/index.html",
    });
  });

  it("redirects the admin path without a trailing slash", () => {
    expect(resolveCmsDirectory("/admin")).toEqual({
      type: "redirect",
      location: "/admin/",
    });
  });

  it("preserves the query string", () => {
    expect(resolveCmsDirectory("/admin/?path=home")).toEqual({
      type: "rewrite",
      url: "/admin/index.html?path=home",
    });
    expect(resolveCmsDirectory("/admin?path=home")).toEqual({
      type: "redirect",
      location: "/admin/?path=home",
    });
  });

  it("leaves Astro routes and unknown paths untouched", () => {
    expect(resolveCmsDirectory("/")).toBeUndefined();
    expect(resolveCmsDirectory("/donate/")).toBeUndefined();
    expect(resolveCmsDirectory("/admin/config.yml")).toBeUndefined();
    expect(resolveCmsDirectory("/nope/")).toBeUndefined();
  });

  it("refuses to serve files outside the public directory", () => {
    expect(resolveCmsDirectory("/../.tmp-cms-routing/")).toBeUndefined();
    expect(resolveCmsDirectory("/../.tmp-cms-routing")).toBeUndefined();
  });
});
