import { chmod, mkdir, readFile, rename, symlink } from "node:fs/promises";
import { join } from "node:path";

import { listContentMedia, resolveContentMedia } from "#content-media";
import { describe, expect, it } from "vitest";

import { fixture, jpeg, pdf, png, webp, write } from "./test-fixtures.ts";

describe("colocated media resolution", () => {
  it("requires a complete entry-directory move when changing an address", async () => {
    const root = await fixture({
      "cms/content/books/original/index.md": "",
      "cms/content/books/original/cover.png": png,
    });
    await mkdir(join(root, "cms/content/books/renamed"));
    await rename(
      join(root, "cms/content/books/original/index.md"),
      join(root, "cms/content/books/renamed/index.md"),
    );
    expect(
      await resolveContentMedia("/media/books/original/cover.png", { root }),
    ).toBeUndefined();
    expect(
      await resolveContentMedia("/media/books/renamed/cover.png", { root }),
    ).toBeUndefined();

    await rename(
      join(root, "cms/content/books/original/cover.png"),
      join(root, "cms/content/books/renamed/cover.png"),
    );
    const asset = await resolveContentMedia("/media/books/renamed/cover.png", {
      root,
    });
    expect(asset).toBeDefined();
    if (!asset) throw new Error("The moved entry asset did not resolve.");
    expect(await readFile(asset.filePath)).toEqual(png);
    expect(
      (await listContentMedia({ root })).map((item) => item.publicPath),
    ).toEqual(["/media/books/renamed/cover.png"]);
  });

  it("resolves owned media beside index.md without reading its draft status", async () => {
    const root = await fixture({
      "cms/content/books/a-book/index.md":
        "---\ndraft: true\n---\nPrivate editorial draft.",
      "cms/content/books/a-book/cover.png": png,
    });
    const asset = await resolveContentMedia("/media/books/a-book/cover.png", {
      root,
    });
    expect(asset).toEqual({
      publicPath: "/media/books/a-book/cover.png",
      filePath: join(root, "cms/content/books/a-book/cover.png"),
      contentType: "image/png",
      size: png.length,
    });
    expect(await listContentMedia({ root })).toEqual([asset]);
  });

  it.each([
    ["photo.jpg", jpeg, "image/jpeg"],
    ["photo.jpeg", jpeg, "image/jpeg"],
    ["poster.png", png, "image/png"],
    ["cover.webp", webp, "image/webp"],
    ["report.pdf", pdf, "application/pdf"],
  ])(
    "serves supported %s assets with their actual media type",
    async (name, bytes, contentType) => {
      const root = await fixture({
        "cms/content/programs/a-program/index.md": "",
        [`cms/content/programs/a-program/${name}`]: bytes,
      });
      expect(
        await resolveContentMedia(`/media/programs/a-program/${name}`, {
          root,
        }),
      ).toMatchObject({ contentType, size: bytes.length });
    },
  );

  it("resolves shared media, including nested shared folders, without an entry", async () => {
    const root = await fixture({
      "cms/public/media/shared/mark.png": png,
      "cms/public/media/shared/archive/report.pdf": pdf,
    });
    expect(
      await resolveContentMedia("/media/shared/mark.png", { root }),
    ).toMatchObject({
      filePath: join(root, "cms/public/media/shared/mark.png"),
    });
    expect(await listContentMedia({ root })).toMatchObject([
      { publicPath: "/media/shared/archive/report.pdf" },
      { publicPath: "/media/shared/mark.png" },
    ]);
  });

  it("uses actual collection folders, not retired aliases, and leaves taxonomy records flat", async () => {
    const root = await fixture({
      "cms/content/general-body-meetings/meeting/index.md": "",
      "cms/content/general-body-meetings/meeting/report.pdf": pdf,
      "cms/content/toolkit-scenarios/workplace/index.md": "",
      "cms/content/toolkit-scenarios/workplace/panel.png": png,
      "cms/content/topics/caste.md": "---\nlabel: Caste\n---",
      "cms/content/categories/news.md": "---\nlabel: News\n---",
    });
    expect(
      (await listContentMedia({ root })).map((asset) => asset.publicPath),
    ).toEqual([
      "/media/general-body-meetings/meeting/report.pdf",
      "/media/toolkit-scenarios/workplace/panel.png",
    ]);
    for (const src of [
      "/media/general-body/meeting/report.pdf",
      "/media/anti-caste-toolkit/workplace/panel.png",
    ]) {
      expect(await resolveContentMedia(src, { root })).toBeUndefined();
    }
  });

  it("decodes safe segments once and ignores query/fragment metadata", async () => {
    const root = await fixture({
      "cms/content/book-readings/a_book~1/index.md": "",
      "cms/content/book-readings/a_book~1/cover-one.png": png,
    });
    expect(
      await resolveContentMedia(
        "/%6dedia/book-readings/a_book%7e1/%63over-one.png?cache=123#preview",
        { root },
      ),
    ).toMatchObject({
      publicPath: "/media/book-readings/a_book~1/cover-one.png",
    });
  });

  it("requires an actual index.md and never falls back to old global media folders", async () => {
    const root = await fixture({
      "cms/content/books/unowned/cover.png": png,
      "cms/public/media/books/a-book/cover.png": png,
      "cms/content/books/flat-record.md": "---\ntitle: Old layout\n---",
    });
    expect(
      await resolveContentMedia("/media/books/unowned/cover.png", { root }),
    ).toBeUndefined();
    expect(
      await resolveContentMedia("/media/books/a-book/cover.png", { root }),
    ).toBeUndefined();
    expect(await listContentMedia({ root })).toEqual([]);
  });

  it("returns undefined for missing assets and empty collections", async () => {
    const root = await fixture();
    expect(
      await resolveContentMedia("/media/books/missing/cover.png", { root }),
    ).toBeUndefined();
    expect(
      await resolveContentMedia("/media/shared/missing.pdf", { root }),
    ).toBeUndefined();
    expect(await listContentMedia({ root })).toEqual([]);
  });

  it("never treats a directory with an asset extension as a file", async () => {
    const root = await fixture({ "cms/content/books/a-book/index.md": "" });
    await mkdir(join(root, "cms/content/books/a-book/not-a-file.png"));
    expect(
      await resolveContentMedia("/media/books/a-book/not-a-file.png", { root }),
    ).toBeUndefined();
    await expect(listContentMedia({ root })).rejects.toThrow(
      /Cannot publish media/,
    );
  });

  it("rejects text or another image format disguised by an allowed extension", async () => {
    const root = await fixture({
      "cms/content/books/a-book/index.md": "",
      "cms/content/books/a-book/secret.jpg":
        "export const credentials = 'private';",
      "cms/content/books/a-book/wrong-format.png": jpeg,
      "cms/public/media/shared/fake.pdf":
        "<!doctype html><title>Not a PDF</title>",
    });
    for (const src of [
      "/media/books/a-book/secret.jpg",
      "/media/books/a-book/wrong-format.png",
      "/media/shared/fake.pdf",
    ]) {
      expect(await resolveContentMedia(src, { root })).toBeUndefined();
    }
    await expect(listContentMedia({ root })).rejects.toThrow(
      /Cannot publish media/,
    );
  });

  it("propagates unexpected filesystem errors rather than treating them as missing", async () => {
    const root = await fixture();
    await expect(
      resolveContentMedia("/media/books/a-book/cover.png", {
        root: join(root, "missing-project"),
      }),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.skipIf(process.getuid?.() === 0)(
    "does not swallow permission errors",
    async () => {
      const root = await fixture({
        "cms/content/books/a-book/index.md": "",
        "cms/content/books/a-book/cover.png": png,
      });
      const file = join(root, "cms/content/books/a-book/cover.png");
      await chmod(file, 0);
      try {
        await expect(
          resolveContentMedia("/media/books/a-book/cover.png", { root }),
        ).rejects.toMatchObject({ code: "EACCES" });
      } finally {
        await chmod(file, 0o600);
      }
    },
  );
});

describe("private paths and traversal", () => {
  it.each([
    "/media/books/a-book/index.md",
    "/media/books/a-book/config.yml",
    "/media/books/a-book/script.ts",
    "/media/books/a-book/script.js",
    "/media/books/a-book/vector.svg",
    "/media/shared/index.html",
    "/media/shared/private.json",
    "/media/shared/.env",
    "/media/shared/.secret.png",
    "/media/books/a-book",
    "/media/books/a-book/",
    "/media/books/a-book/nested/cover.png",
    "/media/books/a-book/cover.png/",
    "/media/books/a-book/../../shared/cover.png",
    "/media/books/a-book/%2e%2e/cover.png",
    "/media/books/%2e%2e/cover.png",
    "/media/books/a-book/%252e%252e.png",
    "/media/books/a-book/folder%2fcover.png",
    "/media/books/a-book/folder%5ccover.png",
    "/media%2fbooks/a-book/cover.png",
    "/media/books/a-book/cover.png%00",
    "/media/books/a-book/cover.png%0a",
    "/media/books/a-book/cover%ZZ.png",
    "/media/books/a-book/%E0%A4%A.png",
    "/media/books//cover.png",
    "//media/books/a-book/cover.png",
    "media/books/a-book/cover.png",
    "https://example.org/media/books/a-book/cover.png",
    "file:///media/books/a-book/cover.png",
    "/media/books\\a-book/cover.png",
  ])("does not map %s to a source file", async (src) => {
    const root = await fixture();
    expect(await resolveContentMedia(src, { root })).toBeUndefined();
  });

  it("never lists Markdown, configuration, scripts, hidden files or nested owned files", async () => {
    const root = await fixture({
      "cms/content/books/a-book/index.md": "Do not publish this as an asset.",
      "cms/content/books/a-book/cover.png": png,
      "cms/content/books/a-book/code.ts": "export const secret = true;",
      "cms/content/books/a-book/config.yml": "private: true",
      "cms/content/books/a-book/.hidden.png": png,
      "cms/content/books/a-book/nested/hidden.png": png,
      "cms/public/media/shared/notes.md": "Private notes.",
      "cms/public/media/shared/vector.svg": "<svg/>",
      "cms/public/media/shared/report.pdf": pdf,
    });
    expect(
      (await listContentMedia({ root })).map((asset) => asset.publicPath),
    ).toEqual(["/media/books/a-book/cover.png", "/media/shared/report.pdf"]);
  });
});

describe("symlink boundaries", () => {
  it("blocks a file symlink, even when its target is a genuine asset", async () => {
    const root = await fixture({ "cms/content/books/a-book/index.md": "" });
    const outside = await fixture({ "private.png": png });
    await symlink(
      join(outside, "private.png"),
      join(root, "cms/content/books/a-book/cover.png"),
    );
    expect(
      await resolveContentMedia("/media/books/a-book/cover.png", { root }),
    ).toBeUndefined();
    await expect(listContentMedia({ root })).rejects.toThrow(
      /Cannot publish media/,
    );
  });

  it("blocks a record directory symlink and a symlinked index.md", async () => {
    const root = await fixture();
    const outside = await fixture({ "index.md": "", "cover.png": png });
    await mkdir(join(root, "cms/content/books"), { recursive: true });
    await symlink(outside, join(root, "cms/content/books/a-book"));
    expect(
      await resolveContentMedia("/media/books/a-book/cover.png", { root }),
    ).toBeUndefined();
    await expect(listContentMedia({ root })).rejects.toThrow(
      /regular index.md/,
    );

    const second = await fixture({ "cms/content/books/a-book/cover.png": png });
    await symlink(
      join(outside, "index.md"),
      join(second, "cms/content/books/a-book/index.md"),
    );
    expect(
      await resolveContentMedia("/media/books/a-book/cover.png", {
        root: second,
      }),
    ).toBeUndefined();
    await expect(listContentMedia({ root: second })).rejects.toThrow(
      /regular index.md/,
    );
  });

  it("blocks symlinked collection roots and shared directories", async () => {
    const root = await fixture();
    const outside = await fixture({
      "books/a-book/index.md": "",
      "books/a-book/cover.png": png,
      "shared/cover.png": png,
    });
    await mkdir(join(root, "cms/content"), { recursive: true });
    await symlink(join(outside, "books"), join(root, "cms/content/books"));
    expect(
      await resolveContentMedia("/media/books/a-book/cover.png", { root }),
    ).toBeUndefined();
    await expect(listContentMedia({ root })).rejects.toThrow(
      /directory must not be a symlink/,
    );

    const shared = await fixture();
    await mkdir(join(shared, "cms/public/media"), { recursive: true });
    await symlink(
      join(outside, "shared"),
      join(shared, "cms/public/media/shared"),
    );
    expect(
      await resolveContentMedia("/media/shared/cover.png", { root: shared }),
    ).toBeUndefined();
    await expect(listContentMedia({ root: shared })).rejects.toThrow(
      /directory must not be a symlink/,
    );
  });

  it("does not make an exception for links pointing inside the project", async () => {
    const root = await fixture({
      "cms/content/books/a-book/index.md": "",
      "cms/content/books/a-book/original.png": png,
    });
    await symlink(
      "original.png",
      join(root, "cms/content/books/a-book/copy.png"),
    );
    expect(
      await resolveContentMedia("/media/books/a-book/copy.png", { root }),
    ).toBeUndefined();
    await write(root, "cms/public/media/shared/report.pdf", pdf);
    expect(
      await resolveContentMedia("/media/shared/report.pdf", { root }),
    ).toBeDefined();
  });
});
