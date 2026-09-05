import { lstat, readFile, readdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { copyContentMedia } from "./copy.ts";
import { fixture, pdf, png, write } from "./test-fixtures.ts";

describe("static media output", () => {
  it("copies owned and shared assets byte-for-byte without editorial source files", async () => {
    const root = await fixture({
      "cms/content/books/a-book/index.md": "---\ndraft: true\n---",
      "cms/content/books/a-book/cover.png": png,
      "cms/content/books/a-book/config.yml": "private: true",
      "cms/content/programs/a-program/index.md": "",
      "cms/content/programs/a-program/report.pdf": pdf,
      "cms/public/media/shared/mark.png": png,
      "cms/public/media/shared/notes.md": "Private notes",
    });
    const outDir = join(root, "dist");
    const assets = await copyContentMedia({ root, outDir });
    expect(assets.map((asset) => asset.publicPath)).toEqual([
      "/media/books/a-book/cover.png",
      "/media/programs/a-program/report.pdf",
      "/media/shared/mark.png",
    ]);
    expect(
      await readFile(join(outDir, "media/books/a-book/cover.png")),
    ).toEqual(png);
    expect(
      await readFile(join(outDir, "media/programs/a-program/report.pdf")),
    ).toEqual(pdf);
    expect(await readFile(join(outDir, "media/shared/mark.png"))).toEqual(png);
    expect(
      (await readdir(join(outDir, "media"), { recursive: true })).filter(
        (path) => /\.(md|yml|ts|json)$/.test(path),
      ),
    ).toEqual([]);
  });

  it("removes stale/private media from an earlier build while preserving other output", async () => {
    const root = await fixture({
      "cms/public/media/shared/mark.png": png,
      "dist/index.html": "<h1>Keep this page</h1>",
      "dist/media/shared/index.md": "PublicDir must not leak this",
      "dist/media/books/deleted/old.png": png,
      "dist/media/old-script.js": "export const privateSource = true;",
    });
    await copyContentMedia({ root, outDir: join(root, "dist") });
    expect(await readdir(join(root, "dist/media/shared"))).toEqual([
      "mark.png",
    ]);
    expect(await readFile(join(root, "dist/index.html"), "utf8")).toBe(
      "<h1>Keep this page</h1>",
    );
    await expect(lstat(join(root, "dist/media/books"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      lstat(join(root, "dist/media/old-script.js")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps identical media owned independently when another entry is deleted", async () => {
    const root = await fixture({
      "cms/content/books/first/index.md": "",
      "cms/content/books/first/cover.png": png,
      "cms/content/books/second/index.md": "",
      "cms/content/books/second/cover.png": png,
    });
    const outDir = join(root, "dist");
    expect(await copyContentMedia({ root, outDir })).toHaveLength(2);
    await rm(join(root, "cms/content/books/first"), { recursive: true });
    expect(await copyContentMedia({ root, outDir })).toHaveLength(1);
    expect(
      await readFile(join(root, "cms/content/books/second/cover.png")),
    ).toEqual(png);
    expect(
      await readFile(join(outDir, "media/books/second/cover.png")),
    ).toEqual(png);
    await expect(
      lstat(join(outDir, "media/books/first")),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("handles an empty media inventory and remains repeatable", async () => {
    const root = await fixture({ "dist/media/stale.png": png });
    const options = { root, outDir: join(root, "dist") };
    expect(await copyContentMedia(options)).toEqual([]);
    expect(await readdir(join(root, "dist/media"))).toEqual([]);
    expect(await copyContentMedia(options)).toEqual([]);
  });

  it("interprets a relative output directory against the configured project root", async () => {
    const root = await fixture({
      "cms/public/media/shared/mark.png": png,
    });
    await copyContentMedia({ root, outDir: "site-output" });
    expect(
      await readFile(join(root, "site-output/media/shared/mark.png")),
    ).toEqual(png);
  });

  it("validates sources before disturbing a prior output tree", async () => {
    const root = await fixture({
      "cms/content/books/a-book/index.md": "",
      "cms/content/books/a-book/not-a-photo.jpg":
        "Private source, not an image.",
      "dist/media/shared/previous.png": png,
    });
    await expect(
      copyContentMedia({ root, outDir: join(root, "dist") }),
    ).rejects.toThrow(/Cannot publish media/);
    expect(
      await readFile(join(root, "dist/media/shared/previous.png")),
    ).toEqual(png);
  });

  it("blocks source symlink escapes instead of copying their target", async () => {
    const root = await fixture({ "cms/content/books/a-book/index.md": "" });
    const outside = await fixture({ "private.png": png });
    await symlink(
      join(outside, "private.png"),
      join(root, "cms/content/books/a-book/cover.png"),
    );
    await expect(
      copyContentMedia({ root, outDir: join(root, "dist") }),
    ).rejects.toThrow(/Cannot publish media/);
    await expect(lstat(join(root, "dist"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects output symlinks without modifying their external target", async () => {
    const root = await fixture({ "cms/public/media/shared/mark.png": png });
    const outside = await fixture({ "keep.txt": "Not build output" });
    await symlink(outside, join(root, "dist"));
    await expect(
      copyContentMedia({ root, outDir: join(root, "dist") }),
    ).rejects.toThrow(/regular directory/);
    expect(await readFile(join(outside, "keep.txt"), "utf8")).toBe(
      "Not build output",
    );

    const second = await fixture({ "dist/index.html": "Keep this" });
    await symlink(outside, join(second, "dist/media"));
    await expect(
      copyContentMedia({ root: second, outDir: join(second, "dist") }),
    ).rejects.toThrow(/regular directory/);
    expect(await readFile(join(outside, "keep.txt"), "utf8")).toBe(
      "Not build output",
    );
  });

  it("rejects output outside the project, the source root, and overlapping CMS paths", async () => {
    const root = await fixture({ "cms/public/media/shared/mark.png": png });
    const outside = await fixture();
    for (const outDir of [
      root,
      outside,
      join(root, "cms"),
      join(root, "cms/content"),
      join(root, "cms/public"),
    ]) {
      await expect(copyContentMedia({ root, outDir })).rejects.toThrow(
        /output must/,
      );
    }
    expect(
      await readFile(join(root, "cms/public/media/shared/mark.png")),
    ).toEqual(png);
  });

  it("removes an output child symlink itself without following it", async () => {
    const root = await fixture({ "dist/media/shared/old.png": png });
    const outside = await fixture({ "keep.txt": "Not media" });
    await symlink(outside, join(root, "dist/media/old-source"));
    await write(root, "cms/public/media/shared/mark.png", png);
    await copyContentMedia({ root, outDir: join(root, "dist") });
    expect(await readFile(join(outside, "keep.txt"), "utf8")).toBe("Not media");
    await expect(
      lstat(join(root, "dist/media/old-source")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
