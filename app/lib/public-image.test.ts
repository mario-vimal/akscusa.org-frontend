import { resolve } from "node:path";

import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveContentMedia, type ContentMediaAsset } from "./content-media";
import { measurePublicImage } from "./public-image";

vi.mock("./content-media", () => ({
  resolveContentMedia: vi.fn(),
}));

const sourceFile = resolve("app/assets/brand/aksc-logo.webp");
const { width, height } = await sharp(sourceFile).metadata();
const resolvedAsset = (publicPath: string): ContentMediaAsset => ({
  publicPath,
  filePath: sourceFile,
  contentType: "image/webp",
  size: 1,
});

beforeEach(() => {
  vi.mocked(resolveContentMedia).mockReset();
});

describe("public image measurement", () => {
  it("measures the resolved source file and shares in-flight measurements", async () => {
    const src = "/media/books/example-book/cover.webp";
    vi.mocked(resolveContentMedia).mockResolvedValue(resolvedAsset(src));

    const first = measurePublicImage(src);
    const second = measurePublicImage(src);
    expect(second).toBe(first);
    await expect(first).resolves.toEqual({ width, height });
    expect(resolveContentMedia).toHaveBeenCalledExactlyOnceWith(src);
  });

  it("uses the same resolver for intentionally shared media", async () => {
    const src = "/media/shared/brand/logo.webp";
    vi.mocked(resolveContentMedia).mockResolvedValue(resolvedAsset(src));

    await expect(measurePublicImage(src)).resolves.toEqual({
      width,
      height,
    });
    expect(resolveContentMedia).toHaveBeenCalledExactlyOnceWith(src);
  });

  it.each([
    "/media/books/example-book/missing.webp",
    "/media/archive/2024/old-source.jpg",
    "https://images.example.org/remote.jpg",
  ])(
    "rejects unresolved sources without guessing another path: %s",
    async (src) => {
      vi.mocked(resolveContentMedia).mockResolvedValue(undefined);

      await expect(measurePublicImage(src)).rejects.toThrow(
        `Missing or unsupported public image source: ${src}`,
      );
      expect(resolveContentMedia).toHaveBeenCalledExactlyOnceWith(src);
    },
  );

  it("does not attempt to measure a resolved PDF as an image", async () => {
    const src = "/media/general-body-meetings/example-meeting/report.pdf";
    vi.mocked(resolveContentMedia).mockResolvedValue({
      ...resolvedAsset(src),
      contentType: "application/pdf",
    });

    await expect(measurePublicImage(src)).rejects.toThrow(
      `Missing or unsupported public image source: ${src}`,
    );
  });

  it("preserves unexpected resolver errors", async () => {
    const src = "/media/programs/example-program/poster.webp";
    const error = new Error("Source storage could not be read");
    vi.mocked(resolveContentMedia).mockRejectedValue(error);

    await expect(measurePublicImage(src)).rejects.toBe(error);
  });
});
