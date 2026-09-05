import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { formatReport, readBuildInventory, verifyLinks } from "./check.ts";
import { readHtml, srcsetUrls } from "./html.ts";

const origin = "https://site.example.test";
const retiredOrigin = "https://akscusa.squarespace.com";
const fixtures = fileURLToPath(
  new URL(`./.test-builds-${randomUUID()}/`, import.meta.url),
);
let fixture = 0;

afterAll(() => rmSync(fixtures, { recursive: true, force: true }));

function html(body: string, canonical = `${origin}/`): string {
  return `<!doctype html><html lang="en"><head><title>Fixture</title><link rel="canonical" href="${canonical}"></head><body>${body}</body></html>`;
}

function build(files: Record<string, string>): string {
  const directory = join(fixtures, String(fixture++));
  mkdirSync(directory, { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    const destination = join(directory, file);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content);
  }
  return directory;
}

function check(body: string, files: Record<string, string> = {}) {
  return verifyLinks(build({ "index.html": html(body), ...files }));
}

describe("build page inventory", () => {
  it("exposes emitted routes, relative files, and unchanged HTML bodies", () => {
    const home = html("<h1>Home</h1>");
    const article = html("<h1>Renamed article</h1>");
    const guide = html("<h1>Café &amp; notes</h1>");
    const notFound = html("<h1>Not found</h1>");
    const directory = build({
      "index.html": home,
      "blog/renamed/index.html": article,
      "guides/café & notes/index.html": guide,
      "404.html": notFound,
      "media/books/example/paper.pdf": "%PDF fixture",
    });
    const inventory = readBuildInventory(directory);
    expect(inventory.pages).toHaveLength(4);
    expect(inventory.pages).toEqual(
      expect.arrayContaining([
        { file: "index.html", route: "/", body: home },
        {
          file: "blog/renamed/index.html",
          route: "/blog/renamed/",
          body: article,
        },
        {
          file: "guides/café & notes/index.html",
          route: "/guides/caf%C3%A9%20%26%20notes/",
          body: guide,
        },
        { file: "404.html", route: "/404.html", body: notFound },
      ]),
    );
    expect(inventory.files.get("media/books/example/paper.pdf")).toBe(
      join(directory, "media/books/example/paper.pdf"),
    );
  });

  it("discovers editorial renames and deletions instead of pinning slugs", () => {
    const directory = build({
      "index.html": html("<h1>Home</h1>"),
      "articles/old-title/index.html": html("<h1>Article</h1>"),
    });
    const before = readBuildInventory(directory);
    renameSync(
      join(directory, "articles/old-title"),
      join(directory, "articles/new-title"),
    );
    const renamed = readBuildInventory(directory);
    expect(before.pages.map((page) => page.route)).toContain(
      "/articles/old-title/",
    );
    expect(renamed.pages.map((page) => page.route)).toContain(
      "/articles/new-title/",
    );
    expect(renamed.pages.map((page) => page.route)).not.toContain(
      "/articles/old-title/",
    );

    rmSync(join(directory, "articles/new-title"), { recursive: true });
    expect(
      readBuildInventory(directory).pages.map((page) => page.route),
    ).toEqual(["/"]);
  });
});

describe("HTML and srcset parsing", () => {
  it("uses HTML semantics for quoted/unquoted attributes, entities, scripts, and comments", () => {
    const page = readHtml(
      `<!-- <img src="/comment.png"> -->
       <script>const markup = "<a href='/script-link'>";</script>
       <A HREF='/guide/?a=1&amp;b=2#intro'>Guide</A>
       <img src=/photo.png>
       <a name="old&amp;new"></a>`,
      "/",
    );
    expect(page.references.map((ref) => ref.url)).toEqual([
      "/guide/?a=1&b=2#intro",
      "/photo.png",
    ]);
    expect(page.anchors.has("old&new")).toBe(true);
    expect(page.references[0]).toMatchObject({
      tag: "a",
      attribute: "href",
      line: 3,
    });
  });

  it("keeps commas inside data URLs and skips srcset descriptors", () => {
    expect(
      srcsetUrls("data:image/svg+xml,%3Csvg%3E,%3C/svg%3E 1x, /large.png 2x"),
    ).toEqual(["data:image/svg+xml,%3Csvg%3E,%3C/svg%3E", "/large.png"]);
    expect(srcsetUrls("/small.png, /large.png 640w, /huge.png 1280w")).toEqual([
      "/small.png",
      "/large.png",
      "/huge.png",
    ]);
  });

  it("checks fallback/template URLs without accepting inert template IDs as fragment targets", () => {
    const report = check(
      `<noscript><img src="/fallback.svg"></noscript>
       <template><h2 id="inert">Inert</h2><img src="/template.svg"></template>
       <a href="#inert">Not an active anchor</a>`,
    );
    expect(report.regressions.map((issue) => issue.code)).toEqual([
      "missing-target",
      "missing-target",
      "missing-fragment",
    ]);
  });
});

describe("static output resolution", () => {
  it("resolves relative and absolute current-origin URLs, clean routes, queries, and index.html", () => {
    const report = check(
      `<a href="./guide#intro">Relative</a>
       <a href="/guide/#intro">Root relative</a>
       <a href="/guide/index.html#intro">Explicit index</a>
       <a href="${origin}/guide/?a=1&amp;b=2#intro">Absolute</a>
       <a href="//site.example.test/guide#intro">Protocol relative</a>
       <a href="http://site.example.test/guide/#intro">HTTP spelling</a>
       <a href="https://www.site.example.test/guide/#intro">Hostname alias</a>
       <a href="/guide/index#intro">Directory index redirect</a>
       <a href="/guide/index/#intro">Directory index slash redirect</a>
       <a href="/flat?version=1#flat">Flat clean URL</a>
       <a href="/flat.html#flat">Explicit HTML</a>
       <a href="/flat/#flat">Flat trailing-slash redirect</a>
       <a href="/release.v1">Dotted clean URL</a>`,
      {
        "guide/index.html": html(
          '<h1 id="intro">Guide</h1><a href="../flat#flat">Up one level</a>',
        ),
        "flat.html": html('<h1 id="flat">Flat</h1>'),
        "release.v1/index.html": html("<h1>Release</h1>"),
      },
    );
    expect(report.regressions).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("decodes UTF-8, percent signs, and entities in filenames and HTML fragments", () => {
    const report = check(
      `<img src="/media/caf%C3%A9%20%26%20tea.png?size=2">
       <img src="/media/100%25.png">
       <a href="/guide/#caf%C3%A9%20%26%20tea">Encoded anchor</a>
       <a href="/guide/#old%26new">Named anchor</a>`,
      {
        "media/café & tea.png": "image",
        "media/100%.png": "image",
        "guide/index.html": html(
          '<h1 id="café &amp; tea">Heading</h1><a name="old&amp;new">Legacy</a>',
        ),
      },
    );
    expect(report.passed).toBe(true);
  });

  it("checks fragments only on HTML, including valid top and text-fragment instructions", () => {
    const report = check(
      `<a href="/guide/#missing">Broken section</a>
       <a href="/guide/#TOP">Top</a>
       <a href="/guide/#:~:text=words">Text</a>
       <a href="/guide/#intro:~:text=words">Section and text</a>
       <a href="/guide/#">Empty fragment</a>
       <a href="/paper.pdf#page=2">PDF page</a>
       <img src="/photo.svg#not-an-html-id">`,
      {
        "guide/index.html": html('<h1 id="intro">Guide</h1>'),
        "paper.pdf": "%PDF fixture",
        "photo.svg": "<svg></svg>",
      },
    );
    expect(report.regressions).toHaveLength(1);
    expect(report.regressions[0]).toMatchObject({
      page: "/",
      url: "/guide/#missing",
      code: "missing-fragment",
    });
    expect(formatReport(report)).toContain(
      'HTML target guide/index.html has no id or named anchor "missing"',
    );
  });

  it("checks every srcset candidate, missing images, and missing PDF links", () => {
    const report = check(
      `<picture><source srcset="data:,placeholder 1x, /missing.webp 2x">
       <img src="/missing.png" srcset="/present.png 1x, /missing-large.png 2x"></picture>
       <a href="/missing.pdf#page=2">PDF</a>`,
      { "present.png": "image", "404.html": html("Not found") },
    );
    expect(
      report.regressions.map((issue) => [
        issue.attribute,
        issue.url,
        issue.code,
      ]),
    ).toEqual([
      ["srcset", "/missing.webp", "missing-target"],
      ["src", "/missing.png", "missing-target"],
      ["srcset", "/missing-large.png", "missing-target"],
      ["href", "/missing.pdf#page=2", "missing-target"],
    ]);
  });

  it("checks entry-owned media solely against emitted output", () => {
    const files = {
      "media/books/example/cover.png": "image",
      "media/books/example/cover-large.webp": "image",
      "media/books/example/reading.pdf": "%PDF fixture",
    };
    const report = check(
      `<img src="/media/books/example/cover.png"
         srcset="/media/books/example/cover.png 1x, /media/books/example/cover-large.webp 2x">
       <a href="/media/books/example/reading.pdf#page=2">Reading</a>`,
      files,
    );
    expect(report.passed).toBe(true);

    const missing = check(
      '<a href="/media/books/example/not-emitted.pdf">Missing attachment</a>',
      files,
    );
    expect(missing.passed).toBe(false);
    expect(missing.regressions[0]).toMatchObject({
      code: "missing-target",
      url: "/media/books/example/not-emitted.pdf",
    });
  });

  it("respects the first document base without requiring the base directory to be a page", () => {
    expect(
      check(
        '<base href="/assets/"><img src="image.png"><a href="../guide#intro">Guide</a>',
        {
          "assets/image.png": "image",
          "guide/index.html": html('<h1 id="intro">Guide</h1>'),
        },
      ).passed,
    ).toBe(true);
  });

  it("reports invalid document bases rather than dropping their validation", () => {
    const report = check(
      '<base href="data:,invalid-base"><img src="/image.png">',
      {
        "image.png": "image",
      },
    );
    expect(report.regressions).toHaveLength(1);
    expect(report.regressions[0]).toMatchObject({
      tag: "base",
      code: "unsupported-scheme",
    });
  });

  it("accepts genuine external HTTP(S), mail, telephone, and data URLs without network requests", () => {
    const report = check(
      `<a href="https://external.example.test/wp-content/uploads/document.pdf">Third-party citation</a>
       <img src="//cdn.example.test/image.png">
       <a href="mailto:hello@example.test?subject=Hello">Email</a>
       <a href="mailto:?subject=Hello">Choose a recipient</a>
       <a href="mailto:">New message</a>
       <a href="tel:+18005550101">Phone</a>
       <img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">
       <a href="">Reload</a>`,
    );
    expect(report.passed).toBe(true);
    expect(report.external).toBe(2);
    expect(formatReport(report)).toContain("syntax-checked, not fetched");
  });

  it.each([
    "javascript:alert(1)",
    "vbscript:alert(1)",
    "file:///outside.txt",
    "ftp://files.example.test/image.jpg",
    "blob:https://site.example.test/example",
  ])("rejects unsupported schemes: %s", (url) => {
    expect(check(`<a href="${url}">Link</a>`).regressions[0]?.code).toBe(
      "unsupported-scheme",
    );
  });

  it.each([
    "https://[invalid",
    "/media/%ZZ.png",
    "/#%E0%A4",
    "tel:",
    "data:not-a-data-url",
  ])("reports malformed URLs and encodings: %s", (url) => {
    expect(check(`<a href="${url}">Link</a>`).regressions[0]?.code).toBe(
      "invalid-url",
    );
  });

  it.each([
    "/%2e%2e%2foutside.pdf",
    "/%5coutside.pdf",
    "/image%00.png",
    "\\outside.pdf",
  ])("rejects unsafe file paths: %s", (url) => {
    expect(check(`<a href="${url}">Link</a>`).regressions[0]?.code).toBe(
      "unsafe-path",
    );
  });

  it("never reads outside the output for parent traversals or symlinks", () => {
    const directory = build({
      "index.html": html('<a href="../../outside.pdf">Outside</a>'),
    });
    const outside = join(fixtures, "outside.pdf");
    writeFileSync(outside, "%PDF outside the build");
    expect(verifyLinks(directory).regressions[0]?.code).toBe("missing-target");
    symlinkSync(outside, join(directory, "linked.pdf"));
    expect(() => verifyLinks(directory)).toThrow(
      "Refusing build-output symlink linked.pdf",
    );
  });
});

describe("production metadata and provenance", () => {
  it("uses browser URL whitespace handling for canonical metadata", () => {
    const report = check("", { "index.html": html("", ` ${origin}/ `) });
    expect(report.origin).toBe(origin);
    expect(report.passed).toBe(true);
  });

  it("derives the origin from sitemap metadata if canonical metadata is unavailable", () => {
    const directory = build({
      "index.html": '<!doctype html><a href="/guide/">Guide</a>',
      "guide/index.html": "<!doctype html><h1>Guide</h1>",
      "sitemap-index.xml": `<?xml version="1.0"?><sitemapindex><sitemap><loc>${origin}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
      "sitemap-0.xml": `<?xml version="1.0"?><urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/guide/</loc></url></urlset>`,
    });
    const report = verifyLinks(directory);
    expect(report.origin).toBe(origin);
    expect(report.passed).toBe(true);
  });

  it("fails closed without HTML or authoritative origin metadata", () => {
    expect(() => verifyLinks(build({ "image.png": "image" }))).toThrow(
      "No built HTML",
    );
    expect(() =>
      verifyLinks(build({ "index.html": "<h1>No metadata</h1>" })),
    ).toThrow("Cannot derive the production origin");
  });

  it("reports conflicting or invalid metadata instead of silently choosing a domain", () => {
    expect(() =>
      check("", {
        "sitemap.xml":
          "<urlset><url><loc>https://different.example.test/</loc></url></urlset>",
      }),
    ).toThrow("Conflicting production origins");
    expect(() =>
      check("", { "index.html": html("", "https://[broken") }),
    ).toThrow("invalid absolute site metadata URL");
  });

  it("does not exempt provenance anchors from missing-target or retiring-host checks", () => {
    const report = check(
      `<a data-provenance href="${origin}/missing-source-page/">Original publication</a>
       <a data-provenance="true" href="${retiredOrigin}/source/">Archived source</a>
       <a data-provenance href="https://research.example.test/report.pdf">Genuine external source</a>
       <div data-provenance><a href="/still-live/">Live link</a></div>
       <a data-provenance href="/source/"><img data-provenance src="/still-live.png"></a>`,
    );
    expect(report.provenance).toBe(4);
    expect(report.regressions.map((issue) => issue.url)).toEqual([
      `${origin}/missing-source-page/`,
      `${retiredOrigin}/source/`,
      "/still-live/",
      "/source/",
      "/still-live.png",
    ]);
    expect(report.regressions[1]?.code).toBe("retiring-host");
    expect(formatReport(report)).toContain(
      "4 marked provenance anchors checked without exemptions",
    );
  });
});

describe("retired source systems", () => {
  it.each([
    "/wp-content/uploads/old.jpg",
    `${origin}/wp-content/uploads/old.jpg?cache=1#source`,
    "http://site.example.test/wp-content/uploads/old.jpg",
    `${origin}/%77p-content/uploads/old.jpg`,
    "https://www.site.example.test/wp-content/uploads/old.jpg",
    "https://site.example.test.:8443/wp-content/uploads/old.jpg",
  ])("rejects legacy media even when the old file exists: %s", (url) => {
    const report = check(
      `<a data-provenance href="${url}">Legacy media</a><img srcset="${url} 1x">`,
      { "wp-content/uploads/old.jpg": "image" },
    );
    expect(report.regressions.map((issue) => issue.code)).toEqual([
      "legacy-wordpress",
      "legacy-wordpress",
    ]);
    expect(report.passed).toBe(false);
  });

  it.each([
    "/wp-includes/wp-embed.js",
    "/wp-admin/",
    "/wp-json/wp/v2/pages/123",
    "/wp-login.php",
    "/xmlrpc.php",
  ])("rejects obsolete WordPress platform endpoints: %s", (url) => {
    expect(check(`<a href="${url}">Old system</a>`).regressions[0]?.code).toBe(
      "legacy-wordpress",
    );
  });

  it.each([
    `${retiredOrigin}/conf-26`,
    `${retiredOrigin}/old-source/`,
    "http://akscusa.squarespace.com/old-source/",
    "//akscusa.squarespace.com/old-source/",
    "https://akscusa.squarespace.com:8443/old-source/",
    "https://www.akscusa.squarespace.com./old-source/",
  ])(
    "rejects the retired Squarespace site even when marked as provenance: %s",
    (url) => {
      const report = check(
        `<a data-provenance href="${url}">Legacy source</a>`,
      );
      expect(report.regressions[0]?.code).toBe("retiring-host");
      expect(report.passed).toBe(false);
    },
  );

  it("preserves new canonical routes, migrated media, and real third-party provenance", () => {
    const report = check(
      `<a href="${origin}/who-said-what/">Recovered game</a>
       <a href="/conferences/current/#details">Local conference</a>
       <img src="${origin}/media/books/example/image.jpg">
       <a href="/media/books/example/paper.pdf#page=2">Local PDF</a>
       <a data-provenance href="https://research.example.test/wp-content/uploads/report.pdf">Third-party WordPress citation</a>
       <a data-provenance href="https://independent-researcher.squarespace.com/article">Third-party Squarespace citation</a>`,
      {
        "who-said-what/index.html": html("<h1>Who said What?!</h1>"),
        "conferences/current/index.html": html(
          '<h1 id="details">Conference</h1>',
        ),
        "media/books/example/image.jpg": "image",
        "media/books/example/paper.pdf": "%PDF fixture",
      },
    );
    expect(report.origin).toBe(origin);
    expect(report.provenance).toBe(2);
    expect(report.regressions).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("reports every remaining legacy reference without a count budget", () => {
    const report = check(
      '<img src="/wp-content/uploads/old.jpg"><img src="/wp-content/uploads/old.jpg">',
    );
    expect(report.regressions).toHaveLength(2);
    expect(report.passed).toBe(false);
    expect(formatReport(report)).toContain("2 blocking references.");
  });

  it("requires recovered routes and replacement media to exist", () => {
    const report = check(
      '<a href="/who-said-what/">Game</a><a href="/share-your-testimonies/">Old CTA</a><img src="/media/books/example/missing.jpg">',
    );
    expect(report.regressions.map((issue) => issue.code)).toEqual([
      "missing-target",
      "missing-target",
      "missing-target",
    ]);
    expect(report.passed).toBe(false);
  });
});

describe("strict CLI", () => {
  const cli = fileURLToPath(new URL("../verify-links.mjs", import.meta.url));

  it("is strict with or without --strict and never rewrites broken output", () => {
    const broken = html(
      `<a data-provenance href="${retiredOrigin}/conf-26">Legacy conference</a>
       <img src="/wp-content/uploads/old.jpg"><img src="/media/books/example/missing.jpg">`,
    );
    const directory = build({
      "index.html": broken,
      "wp-content/uploads/old.jpg": "old image",
      "conferences/current/index.html": html("<h1>Conference</h1>"),
      "media/books/example/migrated.jpg": "migrated image",
    });
    const run = (...args: string[]) =>
      spawnSync(process.execPath, [cli, "--dist", directory, ...args], {
        encoding: "utf8",
        timeout: 30_000,
      });
    for (const args of [[], ["--strict"]]) {
      const result = run(...args);
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr || result.stdout).toBe(1);
      expect(result.stdout).toContain("Static link/media gate: FAIL.");
      expect(result.stdout).toContain("ERROR [retiring-host]");
      expect(result.stdout).toContain("ERROR [legacy-wordpress]");
      expect(result.stdout).toContain("ERROR [missing-target]");
      expect(result.stdout).not.toContain("DEFERRED");
    }
    expect(readFileSync(join(directory, "index.html"), "utf8")).toBe(broken);

    writeFileSync(
      join(directory, "index.html"),
      html(
        '<a href="/conferences/current/">Local conference</a><img src="/media/books/example/migrated.jpg">',
      ),
    );
    for (const args of [[], ["--strict"]]) {
      const result = run(...args);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain("Static link/media gate: PASS.");
      expect(result.stdout).toContain("0 blocking references.");
    }
  });

  it.each(["--strcit", "--no-strict", "--allow-legacy", "--strict=false"])(
    "rejects unknown flags or attempts to disable strictness: %s",
    (flag) => {
      const result = spawnSync(process.execPath, [cli, flag], {
        encoding: "utf8",
      });
      expect(result.status).toBe(1);
    },
  );
});
