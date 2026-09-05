import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { symlink } from "node:fs/promises";
import { join } from "node:path";

import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { contentMediaDevPlugin } from "./dev.ts";
import { fixture, pdf, png, write } from "./test-fixtures.ts";

let server: ViteDevServer | undefined;
let port = 0;
let root = "";

beforeAll(async () => {
  root = await fixture({
    "cms/content/books/a-book/index.md": "Never serve this source document.",
    "cms/content/books/a-book/cover.png": png,
    "cms/content/books/a-book/report.pdf": pdf,
    "cms/public/media/shared/mark.png": png,
    "cms/public/media/shared/private.md":
      "Never serve private media-directory files.",
    "cms/public/health.txt": "ready",
  });
  const outside = await fixture({ "private.png": png });
  await symlink(
    join(outside, "private.png"),
    join(root, "cms/content/books/a-book/escape.png"),
  );
  server = await createServer({
    configFile: false,
    root,
    publicDir: join(root, "cms/public"),
    cacheDir: join(root, ".vite"),
    appType: "custom",
    logLevel: "silent",
    plugins: [contentMediaDevPlugin()],
    optimizeDeps: { noDiscovery: true },
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("No test server address.");
  port = address.port;
});

afterAll(async () => {
  await server?.close();
});

interface Response {
  status: number | undefined;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

function request(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      { hostname: "127.0.0.1", port, path, method, headers },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}

describe("Vite colocated media serving", () => {
  it("starts a responsive server and leaves non-media requests to Vite", async () => {
    const response = await request("/health.txt");
    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("ready");
  });

  it("serves owned and shared images with correct content types and nosniff", async () => {
    for (const src of [
      "/media/books/a-book/cover.png",
      "/media/shared/mark.png",
    ]) {
      const response = await request(src);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(png);
      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    }
  });

  it("uses the static handler for HEAD and conditional GET requests", async () => {
    const head = await request("/media/books/a-book/report.pdf", "HEAD");
    expect(head.status).toBe(200);
    expect(head.body).toHaveLength(0);
    expect(Number(head.headers["content-length"])).toBe(pdf.length);
    expect(head.headers["content-type"]).toBe("application/pdf");
    const etag = head.headers.etag;
    if (!etag) throw new Error("Static media response has no ETag.");
    const cached = await request("/media/books/a-book/report.pdf", "GET", {
      "If-None-Match": etag,
    });
    expect(cached.status).toBe(304);
    expect(cached.body).toHaveLength(0);
  });

  it("delegates valid and unsatisfiable byte ranges to Vite", async () => {
    const partial = await request("/media/books/a-book/report.pdf", "GET", {
      Range: "bytes=0-4",
    });
    expect(partial.status).toBe(206);
    expect(partial.body.toString()).toBe("%PDF-");
    expect(partial.headers["content-range"]).toBe(`bytes 0-4/${pdf.length}`);
    const unsatisfiable = await request(
      "/media/books/a-book/report.pdf",
      "GET",
      { Range: "bytes=999999-" },
    );
    expect(unsatisfiable.status).toBe(416);
  });

  it("decodes safe URLs without treating ?raw or ?import as module requests", async () => {
    const response = await request("/%6dedia/books/a-book/%63over.png?raw");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(png);
    expect(response.headers["content-type"]).toBe("image/png");
  });

  it("serves newly saved assets without rebuilding a cached file inventory", async () => {
    await write(
      root,
      "cms/content/books/new-book/index.md",
      "---\ndraft: true\n---",
    );
    await write(root, "cms/content/books/new-book/cover.png", png);
    const response = await request("/media/books/new-book/cover.png");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(png);
  });

  it.each([
    "/media/books/a-book/index.md",
    "/media/shared/private.md",
    "/media/books/a-book/missing.png",
    "/media/books/a-book/escape.png",
    "/media/books/a-book/../../shared/mark.png",
    "/media/books/a-book/%2e%2e/index.md",
    "/media/books/a-book/%252e%252e.png",
    "/media/books/a-book/cover%ZZ.png",
    "/%6dedia/books/a-book/cover%ZZ.png",
    "/media%2fbooks/a-book/cover.png",
    "/media\\shared\\private.md",
    "//media/shared/private.md",
    "/media%2fshared/private%ZZ.md",
  ])("blocks %s before public or filesystem fallbacks", async (src) => {
    const response = await request(src);
    expect(response.status).toBe(404);
    expect(response.body.toString()).toBe("Not found.");
  });

  it("allows only read methods for media endpoints", async () => {
    const response = await request("/media/books/a-book/cover.png", "POST");
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("GET, HEAD");
  });
});
