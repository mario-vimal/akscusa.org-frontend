import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

import { readBuildInventory } from "./links/check.ts";

const host = "127.0.0.1";
const inventory = readBuildInventory(
  fileURLToPath(new URL("../dist", import.meta.url)),
);
const routes = new Map([
  ["/", "Educate, Organize &amp; Agitate"],
  ["/anti-caste-helpline/", "Anti-Caste Helpline"],
  [
    "/testimonies-of-practice-of-caste-in-the-usa/",
    "Testimonies of Caste in the USA",
  ],
  ["/blog/", "Blog"],
  ["/press-releases/", "Press Releases and Statements"],
  ["/interventions/", "Interventions"],
  ["/actions/", "What we do"],
  ["/book-readings/", "Book Readings"],
  ["/books/", "Every book the reading circle has worked through"],
  ["/conferences/", "Conferences"],
  ["/programs/", "Programs"],
  ["/join/", "Open membership application"],
  ["/organization/", "What is AKSC"],
  ["/organization/constitution/", "Article I - Name"],
  ["/organization/general-body/", "General Body"],
  ["/comics/", "Comics"],
  ["/anti-caste-toolkit/", "A Playbook to kickstart our Toolkit"],
  ["/contact/", "Best way to reach us"],
  ["/donate/", "Donate"],
  ["/admin/", "AKSC USA Content Manager"],
  [
    "/admin/config.yml",
    await readFile(
      new URL("../dist/admin/config.yml", import.meta.url),
      "utf8",
    ),
  ],
]);

async function findAvailablePort() {
  const server = createServer();
  server.listen(0, host);
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not allocate a port for Wrangler.");
  }

  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForWrangler(url, process) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error("Wrangler exited before its Pages server was ready.");
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2_000),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Wrangler may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Timed out waiting for the Wrangler Pages server.");
}

async function stopProcess(process) {
  if (process.exitCode !== null) {
    return;
  }

  process.kill("SIGTERM");

  await Promise.race([
    once(process, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (process.exitCode === null) {
    process.kill("SIGKILL");
    await once(process, "exit");
  }
}

const port = await findAvailablePort();
const origin = `http://${host}:${port}`;
const wranglerPath = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const wrangler = spawn(
  process.execPath,
  [wranglerPath, "pages", "dev", "dist", "--ip", host, "--port", String(port)],
  {
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let output = "";
const captureOutput = (chunk) => {
  output = `${output}${chunk}`.slice(-20_000);
};

wrangler.stdout.on("data", captureOutput);
wrangler.stderr.on("data", captureOutput);

try {
  await waitForWrangler(origin, wrangler);

  for (const [route, marker] of routes) {
    const response = await fetch(`${origin}${route}`, {
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`${route} returned HTTP ${response.status}.`);
    }

    if (!body.includes(marker)) {
      throw new Error(`${route} did not contain its expected content.`);
    }
  }

  // The sitemap and robots.txt are checked against each other rather than
  // against a literal domain, because the domain is `site` in
  // `astro.config.mjs` and repeating it here is how a test comes to assert the
  // old address after a move. What matters is that the three agree, and that
  // the sitemap covers the routes rather than the CMS.
  const readText = async (path) => {
    const response = await fetch(`${origin}${path}`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`${path} returned HTTP ${response.status}.`);
    }

    return response.text();
  };

  const index = await readText("/sitemap-index.xml");
  const [, indexed] = index.match(/<loc>([^<]+)<\/loc>/) ?? [];

  if (!indexed) {
    throw new Error("/sitemap-index.xml names no sitemap.");
  }

  const site = new URL(indexed).origin;
  const sitemap = await readText(new URL(indexed).pathname);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, url]) => url,
  );

  for (const url of urls) {
    if (new URL(url).origin !== site) {
      throw new Error(`${url} is not on the site the sitemap index names.`);
    }
  }

  const listed = new Set(urls.map((url) => new URL(url).pathname));
  for (const page of inventory.pages) {
    if (page.file === "404.html" || page.file.startsWith("admin/")) continue;
    if (!listed.has(page.route)) {
      throw new Error(
        `${page.route} was built but is missing from the sitemap.`,
      );
    }
  }

  // Editors can rename, draft or delete an entry. Verify the pages this build
  // actually publishes rather than requiring a permanent set of sample slugs
  // and titles that would reject those ordinary editorial changes.
  const checked = new Set(routes.keys());
  for (const path of listed) {
    if (checked.has(path)) continue;
    const body = await readText(path);
    if (!body.includes('id="main-content"') || !/<h1(?:\s|>)/.test(body)) {
      throw new Error(`${path} is missing its main content or heading.`);
    }
    checked.add(path);
  }

  for (const path of ["/", ...routes.keys()].filter(
    (path) => path.endsWith("/") && !path.startsWith("/admin"),
  )) {
    if (!listed.has(path)) {
      throw new Error(
        `${path} is a page of this site but is not in ${indexed}.`,
      );
    }
  }

  // The CMS is a single-page app behind GitHub sign-in, so indexing it would
  // put a sign-in wall in search results.
  if ([...listed].some((path) => path.startsWith("/admin"))) {
    throw new Error(`${indexed} lists the CMS.`);
  }

  const robots = await readText("/robots.txt");
  const sitemapUrl = new URL("/sitemap-index.xml", site).href;

  for (const line of [`Sitemap: ${sitemapUrl}`, "Disallow: /admin/"]) {
    if (!robots.includes(line)) {
      throw new Error(`/robots.txt does not say "${line}".`);
    }
  }

  // A PDF has no HTML head, so its tab icon comes from this conventional root
  // path. Verify the built Pages output rather than only the source file:
  // otherwise an incorrect publicDir could silently put the icon elsewhere.
  const favicon = await fetch(`${origin}/favicon.ico`, {
    signal: AbortSignal.timeout(5_000),
  });
  const icon = Buffer.from(await favicon.arrayBuffer());

  if (!favicon.ok) {
    throw new Error(`/favicon.ico returned HTTP ${favicon.status}.`);
  }

  if (icon.readUInt16LE(0) !== 0 || icon.readUInt16LE(2) !== 1) {
    throw new Error("/favicon.ico is not a valid icon resource.");
  }

  console.log(
    `Wrangler Pages verified ${checked.size} routes and the root favicon.`,
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await stopProcess(wrangler);
}
