import { describe, expect, it, vi } from "vitest";

import { missingMedia, missingContentMedia } from "./media-references";

vi.mock("~/lib/content-media", () => ({
  resolveContentMedia: async (path: string) =>
    path === "/media/comics/published/panel.png"
      ? {
          publicPath: path,
          filePath: "owned-panel.png",
          contentType: "image/png",
          size: 1,
        }
      : undefined,
}));

describe("shared media retention", () => {
  const available = ["/media/shared/first.png", "/media/shared/shared.png"];
  const entries = [
    { id: "first", panels: available },
    { id: "second", panels: [available[1]] },
  ];

  it("allows deleting an entry while retaining its uploaded assets", () => {
    const remaining = entries.filter((entry) => entry.id !== "first");

    expect(
      missingMedia(
        remaining.flatMap((entry) => entry.panels),
        available,
      ),
    ).toEqual([]);
    expect(available).toEqual([
      "/media/shared/first.png",
      "/media/shared/shared.png",
    ]);
  });

  it("allows deleting the last entry without deleting its assets", () => {
    expect(missingMedia([], available)).toEqual([]);
  });

  it("still rejects removing an asset used by a surviving entry", () => {
    expect(missingMedia(entries[1].panels, [available[0]])).toEqual([
      "/media/shared/shared.png",
    ]);
  });

  it("allows intentional sharing and reports each missing file once", () => {
    expect(
      missingMedia(
        entries.flatMap((entry) => entry.panels),
        [],
      ),
    ).toEqual(available);
  });

  it("uses the serving resolver for owned media rather than the public directory", async () => {
    expect(
      await missingContentMedia([
        "/media/comics/published/panel.png",
        "/media/comics/deleted/panel.png",
      ]),
    ).toEqual(["/media/comics/deleted/panel.png"]);
  });
});
