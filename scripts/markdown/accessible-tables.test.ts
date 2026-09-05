import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import type { Element } from "hast";
import { htmlToHast, type HastNode } from "satteri";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { measurePublicImage } from "~/lib/public-image";
import { accessibleTables } from "./accessible-tables";

vi.mock("~/lib/public-image", () => ({
  measurePublicImage: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(measurePublicImage).mockReset();
  vi.mocked(measurePublicImage).mockResolvedValue({ width: 1280, height: 800 });
});

const elements = (node: HastNode, tagName: string): Element[] => {
  if (node.type !== "root" && node.type !== "element") return [];
  return [
    ...(node.type === "element" && node.tagName === tagName ? [node] : []),
    ...node.children.flatMap((child) => elements(child, tagName)),
  ];
};

const render = async (markdown: string, passes = 1) => {
  const processor = await createSatteriMarkdownProcessor({
    syntaxHighlight: false,
    features: { rawHtml: true },
    hastPlugins: Array.from({ length: passes }, () => accessibleTables),
  });
  const result = await processor.render(markdown);
  return {
    ...result,
    tree: htmlToHast(result.code, { fragment: true }),
  };
};

describe("accessible Markdown tables", () => {
  it("renders a labeled keyboard-scrolling region while preserving table semantics", async () => {
    const { tree } = await render(`
## Membership *dues*

| Membership | Amount |
| --- | --- |
| Student | $20 |
`);
    const wrappers = elements(tree, "div");
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].properties).toMatchObject({
      className: ["prose-table-scroll"],
      role: "region",
      ariaLabel: "Membership dues (scroll horizontally)",
      tabIndex: 0,
    });

    expect(elements(wrappers[0], "table")).toHaveLength(1);
    expect(elements(wrappers[0], "thead")).toHaveLength(1);
    expect(elements(wrappers[0], "tbody")).toHaveLength(1);
    expect(elements(wrappers[0], "th")).toHaveLength(2);
    expect(elements(wrappers[0], "td")).toHaveLength(2);
  });

  it("preserves a raw HTML table's caption, attributes, and original wording", async () => {
    const { tree, code } = await render(`
## Organization

<table id="contacts">
<caption>Local <strong>chapter</strong> contacts</caption>

<tr><th scope="col">Region</th><th scope="col">Contact</th></tr>

<tr><td>Bay Area</td><td><a href="mailto:ec@akscusa.org">Email AKSC</a></td></tr>
</table>
`);
    const wrappers = elements(tree, "div");
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].properties.ariaLabel).toBe(
      "Local chapter contacts (scroll horizontally)",
    );
    expect(elements(tree, "table")[0].properties.id).toBe("contacts");
    expect(elements(tree, "th")[0].properties.scope).toBe("col");
    expect(code).toContain('href="mailto:ec@akscusa.org">Email AKSC</a>');
    expect(code).toContain("<td>Bay Area</td>");
  });

  it("uses the nearest section heading and keeps ordinary Markdown intact", async () => {
    const { tree, code, metadata } = await render(`
## First section

Original **wording** stays intact.

| Name | Count |
| --- | --- |
| First | 1 |

## Second section

| Name | Count |
| --- | --- |
| Second | 2 |
`);
    expect(
      elements(tree, "div").map((wrapper) => wrapper.properties.ariaLabel),
    ).toEqual([
      "First section (scroll horizontally)",
      "Second section (scroll horizontally)",
    ]);
    expect(code).toContain(
      "<p>Original <strong>wording</strong> stays intact.</p>",
    );
    expect(metadata.headings.map((heading) => heading.slug)).toEqual([
      "first-section",
      "second-section",
    ]);
  });

  it("names otherwise unlabeled tables without adding conflicting IDs", async () => {
    const { tree } = await render(`
| Name | Count |
| --- | --- |
| First | 1 |

A second table:

| Name | Count |
| --- | --- |
| Second | 2 |
`);
    const wrappers = elements(tree, "div");
    expect(wrappers.map((wrapper) => wrapper.properties.ariaLabel)).toEqual([
      "Table 1 (scroll horizontally)",
      "Table 2 (scroll horizontally)",
    ]);
    for (const wrapper of wrappers) {
      expect(wrapper.properties).not.toHaveProperty("id");
    }
  });

  it("does not double-wrap tables when run more than once", async () => {
    const markdown = `
| Name | Count |
| --- | --- |
| First | 1 |
`;
    const once = await render(markdown);
    const twice = await render(markdown, 2);
    expect(twice.code).toEqual(once.code);
  });
});

describe("stable public Markdown images", () => {
  it("reserves local image dimensions without changing the URL or editorial alt text", async () => {
    const { tree } = await render(
      "![AKSC discussion flyer](/media/programs/example-program/discussion.jpg)",
    );
    expect(elements(tree, "img")[0].properties).toMatchObject({
      src: "/media/programs/example-program/discussion.jpg",
      alt: "AKSC discussion flyer",
      width: 1280,
      height: 800,
    });
    expect(measurePublicImage).toHaveBeenCalledExactlyOnceWith(
      "/media/programs/example-program/discussion.jpg",
    );
  });

  it("handles images inside tables in the same pass as keyboard wrappers", async () => {
    const { tree } = await render(`
## Speakers

| Speaker | Details |
| --- | --- |
| ![Speaker portrait](/media/speakers/example-speaker/portrait.png) | Original biography |
`);
    expect(elements(tree, "div")[0].properties.ariaLabel).toBe(
      "Speakers (scroll horizontally)",
    );
    expect(elements(tree, "img")[0].properties).toMatchObject({
      width: 1280,
      height: 800,
    });
    expect(measurePublicImage).toHaveBeenCalledTimes(1);
  });

  it("measures images inside an existing scrolling table without nesting another wrapper", async () => {
    const { tree } = await render(`
<div class="prose-table-scroll" role="region" aria-label="Speakers" tabindex="0">
<table><tr><td><img src="/media/speakers/example-speaker/portrait.png" alt="Speaker"></td></tr></table>
</div>
`);
    expect(elements(tree, "div")).toHaveLength(1);
    expect(elements(tree, "img")[0].properties).toMatchObject({
      width: 1280,
      height: 800,
    });
  });

  it("does not measure an already sized image again on a second plugin pass", async () => {
    const { tree } = await render(
      "![Discussion flyer](/media/programs/example-program/discussion.jpg)",
      2,
    );
    expect(elements(tree, "img")[0].properties).toMatchObject({
      width: 1280,
      height: 800,
    });
    expect(measurePublicImage).toHaveBeenCalledTimes(1);
  });

  it("preserves complete authored dimensions without measuring the image", async () => {
    const { tree } = await render(
      '<img src="/media/programs/example-program/flyer.jpg" alt="Flyer" width="640" height="400">',
    );
    expect(elements(tree, "img")[0].properties).toMatchObject({
      width: 640,
      height: 400,
    });
    expect(measurePublicImage).not.toHaveBeenCalled();
  });

  it("fills a missing numeric dimension at the original image ratio", async () => {
    const { tree } = await render(`
<img src="/media/programs/example-program/flyer.jpg" alt="Flyer" width="640">
<img src="/media/programs/example-program/flyer.jpg" alt="Flyer" height="200">
`);
    expect(
      elements(tree, "img").map((image) => image.properties),
    ).toMatchObject([
      { width: 640, height: 400 },
      { width: 320, height: 200 },
    ]);
  });

  it("leaves relative imports, remote URLs, and authored percentage sizing alone", async () => {
    const { tree, metadata } = await render(`
![External](https://images.example.org/flyer.jpg)

![Protocol-relative](//images.example.org/flyer.jpg)

![Imported](./flyer.jpg)

<img src="/media/programs/example-program/flyer.jpg" alt="Fluid flyer" width="100%">
`);
    expect(measurePublicImage).not.toHaveBeenCalled();
    expect(elements(tree, "img")[0].properties).not.toHaveProperty("width");
    expect(elements(tree, "img")[1].properties).not.toHaveProperty("width");
    expect(metadata.localImagePaths).toContain("./flyer.jpg");
    expect(elements(tree, "img")[3].properties.width).toBe("100%");
  });

  it("surfaces a missing public file instead of silently publishing an unstable image", async () => {
    vi.mocked(measurePublicImage).mockRejectedValue(
      new Error(
        "Missing public image: /media/programs/example-program/missing.jpg",
      ),
    );
    await expect(
      render("![Missing](/media/programs/example-program/missing.jpg)"),
    ).rejects.toThrow(
      "Missing public image: /media/programs/example-program/missing.jpg",
    );
  });
});
