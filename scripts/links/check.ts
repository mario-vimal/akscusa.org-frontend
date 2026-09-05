import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { readHtml, sitemapLocations, type Reference } from "./html.ts";

export interface BuiltPage {
  file: string;
  route: string;
  body: string;
}

export interface BuildInventory {
  files: ReadonlyMap<string, string>;
  pages: readonly BuiltPage[];
}

export interface Issue extends Reference {
  code:
    | "invalid-url"
    | "unsupported-scheme"
    | "unsafe-path"
    | "missing-target"
    | "missing-fragment"
    | "legacy-wordpress"
    | "retiring-host";
  message: string;
  target?: string;
}

const retiredSiteHostname = "akscusa.squarespace.com";
const wordpressSystemRoots = new Set([
  "wp-content",
  "wp-includes",
  "wp-admin",
  "wp-json",
  "wp-login.php",
  "xmlrpc.php",
]);

function hostname(url: URL): string {
  return url.hostname.replace(/^www\./, "").replace(/\.$/, "");
}

function outputFiles(directory: string): Map<string, string> {
  const root = resolve(directory);
  if (!lstatSync(root).isDirectory()) {
    throw new Error(`Build output is not a directory: ${root}`);
  }
  const files = new Map<string, string>();
  const visit = (directory: string, prefix: string) => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name, "en"),
    );
    for (const entry of entries) {
      const path = prefix + entry.name;
      const absolute = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Refusing build-output symlink ${path}; link checks never follow symlinks.`,
        );
      }
      if (entry.isDirectory()) visit(absolute, `${path}/`);
      if (entry.isFile()) files.set(path, absolute);
    }
  };
  visit(root, "");
  return files;
}

function pageRoute(file: string): string {
  const path = file.split("/").map(encodeURIComponent).join("/");
  return path === "index.html"
    ? "/"
    : `/${path.endsWith("/index.html") ? path.slice(0, -10) : path}`;
}

export function readBuildInventory(directory: string): BuildInventory {
  const files = outputFiles(directory);
  const pages = [...files]
    .filter(([file]) => /\.html?$/i.test(file))
    .map(([file, absolute]) => ({
      file,
      route: pageRoute(file),
      body: readFileSync(absolute, "utf8"),
    }));
  if (!pages.length) {
    throw new Error(
      `No built HTML found in ${resolve(directory)}; build the site first.`,
    );
  }
  return { files, pages };
}

function productionOrigin(metadata: Reference[]): string {
  const origins = new Map<string, Reference>();
  for (const reference of metadata) {
    const raw = reference.url.trim();
    if (reference.tag === "link" && !/^[a-z][a-z\d+.-]*:/i.test(raw)) {
      continue;
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new Error(
        `${reference.page}: invalid absolute site metadata URL ${JSON.stringify(reference.url)}.`,
        { cause: error },
      );
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(
        `${reference.page}: site metadata must use HTTP(S): ${JSON.stringify(reference.url)}.`,
      );
    }
    origins.set(url.origin, reference);
  }
  if (origins.size === 0) {
    throw new Error(
      "Cannot derive the production origin: output needs an absolute canonical URL or sitemap <loc>.",
    );
  }
  if (origins.size !== 1) {
    throw new Error(
      `Conflicting production origins in build metadata: ${[...origins]
        .map(
          ([origin, reference]) =>
            `${origin} (${reference.page}: ${reference.url})`,
        )
        .join(", ")}.`,
    );
  }
  return origins.keys().next().value!;
}

function parseReference(reference: Reference, base: URL): URL | Issue {
  const raw = reference.url.trim();
  if (
    [...raw].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    return {
      ...reference,
      code: "invalid-url",
      message: "URL contains control characters.",
    };
  }
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return {
      ...reference,
      code: "invalid-url",
      message: "URL cannot be resolved.",
    };
  }
  if (!["http:", "https:", "mailto:", "tel:", "data:"].includes(url.protocol)) {
    return {
      ...reference,
      code: "unsupported-scheme",
      message: `Unsupported URL scheme ${url.protocol}`,
    };
  }
  if (reference.tag === "base" && !["http:", "https:"].includes(url.protocol)) {
    return {
      ...reference,
      code: "unsupported-scheme",
      message: "A document base URL must use HTTP(S).",
    };
  }
  if (
    (url.protocol === "tel:" && !url.pathname) ||
    (url.protocol === "data:" && !url.pathname.includes(","))
  ) {
    return {
      ...reference,
      code: "invalid-url",
      message: `Invalid ${url.protocol} URL.`,
    };
  }
  if (["http:", "https:"].includes(url.protocol) && raw.includes("\\")) {
    return {
      ...reference,
      code: "unsafe-path",
      message: "Backslashes are not permitted in web paths.",
    };
  }
  return url;
}

function decodedPath(url: URL, reference: Reference): string | Issue {
  try {
    const segments = url.pathname
      .split("/")
      .map((segment) => decodeURIComponent(segment));
    if (
      segments.some(
        (segment) =>
          segment === "." ||
          segment === ".." ||
          segment.includes("/") ||
          segment.includes("\\") ||
          [...segment].some((character) => character.charCodeAt(0) < 32),
      )
    ) {
      return {
        ...reference,
        code: "unsafe-path",
        message:
          "Encoded separators, traversal segments, or control characters are not permitted in file paths.",
      };
    }
    return segments.join("/").slice(1);
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    return {
      ...reference,
      code: "invalid-url",
      message: "Path contains malformed percent encoding.",
    };
  }
}

function findTarget(
  path: string,
  files: ReadonlyMap<string, string>,
): string | undefined {
  // Pages redirects /flat/ to /flat when flat.html exists, and /dir/index
  // to /dir/. Follow only those emitted-file aliases, never its 404 fallback.
  for (;;) {
    if (files.has(path)) return path;
    if (!path || path.endsWith("/")) {
      if (files.has(`${path}index.html`)) return `${path}index.html`;
      if (/(^|\/)index\/$/.test(path)) {
        path = path.slice(0, -6);
        continue;
      }
      if (path && files.has(`${path.slice(0, -1)}.html`)) {
        path = path.slice(0, -1);
        continue;
      }
      return undefined;
    }
    if (/(^|\/)index$/.test(path)) {
      path = path.slice(0, -5);
      continue;
    }
    return [`${path}.html`, `${path}/index.html`].find((candidate) =>
      files.has(candidate),
    );
  }
}

export function verifyLinks(directory: string) {
  const { files, pages: htmlPages } = readBuildInventory(directory);
  const pages = new Map(
    htmlPages.map(({ file, route, body }) => [file, readHtml(body, route)]),
  );
  const sitemap = [...files]
    .filter(([file]) => /(^|\/)sitemap[^/]*\.xml$/i.test(file))
    .flatMap(([file, absolute]) =>
      sitemapLocations(readFileSync(absolute, "utf8"), `/${file}`),
    );
  const origin = productionOrigin([
    ...[...pages.values()].flatMap((page) => page.canonicals),
    ...sitemap,
  ]);
  const site = new URL(origin);
  const issues: Issue[] = [];
  let references = 0;
  let provenance = 0;
  let external = 0;

  for (const [file, page] of pages) {
    const documentUrl = new URL(pageRoute(file), site);
    const parsedBase = page.base
      ? parseReference(page.base, documentUrl)
      : documentUrl;
    const base = parsedBase instanceof URL ? parsedBase : documentUrl;
    provenance += page.provenance;

    for (const reference of page.references) {
      references++;
      const url = parseReference(
        reference,
        reference.tag === "base" ? documentUrl : base,
      );
      if (!(url instanceof URL)) {
        issues.push(url);
        continue;
      }
      if (!["http:", "https:"].includes(url.protocol)) continue;

      // HTTP and common hostname aliases still identify this deployment;
      // they must not turn its old WordPress URLs into third-party links.
      const sameSite = hostname(url) === hostname(site);
      const local = sameSite && url.port === site.port;
      const target = local
        ? `${url.pathname}${url.search}${url.hash}`
        : url.href;
      const ref = { ...reference, target };
      if (!local) external++;
      if (hostname(url) === retiredSiteHostname) {
        issues.push({
          ...ref,
          code: "retiring-host",
          message: `Retired site ${url.hostname}; replace this URL with its new-site destination.`,
        });
        continue;
      }
      if (!sameSite) continue;
      const path = decodedPath(url, ref);
      if (typeof path !== "string") {
        issues.push(path);
        continue;
      }
      if (wordpressSystemRoots.has(path.split("/")[0] ?? "")) {
        issues.push({
          ...ref,
          code: "legacy-wordpress",
          message:
            "Retired WordPress URL; preserve its content in the new site and update this reference to the migrated destination.",
        });
        continue;
      }
      if (!local) continue;
      if (reference.tag === "base") continue;
      const targetFile = findTarget(path, files);
      if (!targetFile) {
        issues.push({
          ...ref,
          code: "missing-target",
          message: `No emitted file or clean-URL HTML target for ${JSON.stringify(url.pathname)}.`,
        });
        continue;
      }
      const targetPage = pages.get(targetFile);
      if (!url.hash || !targetPage) continue;
      let fragment: string;
      try {
        // Text-fragment directives are browser search instructions, not IDs.
        fragment = decodeURIComponent(url.hash.slice(1).split(":~:")[0]!);
      } catch (error) {
        if (!(error instanceof URIError)) throw error;
        issues.push({
          ...ref,
          code: "invalid-url",
          message: "Fragment contains malformed percent encoding.",
        });
        continue;
      }
      if (
        fragment &&
        fragment.toLowerCase() !== "top" &&
        !targetPage.anchors.has(fragment)
      ) {
        issues.push({
          ...ref,
          code: "missing-fragment",
          message: `HTML target ${targetFile} has no id or named anchor ${JSON.stringify(fragment)}.`,
        });
      }
    }
  }
  return {
    origin,
    pages: pages.size,
    references,
    provenance,
    external,
    regressions: issues,
    passed: issues.length === 0,
  };
}

export type LinkReport = ReturnType<typeof verifyLinks>;

function location(reference: Reference): string {
  return `${reference.page}${reference.line ? `:${reference.line}:${reference.column}` : ""}`;
}

export function formatReport(report: LinkReport): string {
  const lines = [
    `Static link/media gate: ${report.passed ? "PASS" : "FAIL"}.`,
    `Scanned ${report.pages} HTML pages and ${report.references} references for ${report.origin}, including ${report.provenance} marked provenance anchors checked without exemptions.`,
    `${report.external} external HTTP(S) references were syntax-checked, not fetched. Legacy WordPress/Squarespace URLs are always rejected.`,
  ];
  for (const issue of report.regressions) {
    lines.push(
      `ERROR [${issue.code}] ${location(issue)} <${issue.tag} ${issue.attribute}> ${JSON.stringify(issue.url)} — ${issue.message}`,
    );
  }
  lines.push(`${report.regressions.length} blocking references.`);
  return lines.join("\n");
}
