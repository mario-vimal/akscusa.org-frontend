import { expect, test as base, type Page } from "@playwright/test";
import axe from "axe-core";

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (!baseURL)
      throw new Error("Browser tests require a configured baseURL.");
    const origin = new URL(baseURL).origin;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    // Third-party availability is not a prerequisite for a local regression
    // run. The link gate separately inventories and blocks cutover debt.
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.origin === origin ? route.continue() : route.abort();
    });
    await use(page);
    expect(errors, "Uncaught browser errors").toEqual([]);
  },
});

export { expect };

export async function visit(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status(), path).toBe(200);
  await page.locator("main h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function locations(page: Page, xml: string): Promise<string[]> {
  return page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, "application/xml");
    if (document.querySelector("parsererror")) {
      throw new Error("The generated sitemap is not valid XML.");
    }
    return [...document.querySelectorAll("loc")].map(
      (element) => element.textContent ?? "",
    );
  }, xml);
}

export async function publishedPaths(page: Page): Promise<string[]> {
  const response = await page.request.get("/sitemap-index.xml");
  await expect(response).toBeOK();
  const maps = await locations(page, await response.text());
  const paths = new Set<string>();

  for (const map of maps) {
    const response = await page.request.get(new URL(map).pathname);
    await expect(response).toBeOK();
    for (const url of await locations(page, await response.text())) {
      paths.add(new URL(url).pathname);
    }
  }

  expect(paths.size, "Published pages in the sitemap").toBeGreaterThan(0);
  return [...paths].sort();
}

export function representativePaths(paths: readonly string[]): string[] {
  const selected = new Map<string, string>();
  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    const template =
      parts.length < 2 || parts[0] === "organization"
        ? path
        : `${parts[0]}/entry`;
    if (!selected.has(template)) selected.set(template, path);
  }
  return [...selected.values()];
}

export async function accessibilityFailures(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    function isAxeRuntime(
      value: unknown,
    ): value is Pick<typeof import("axe-core"), "run"> {
      return (
        typeof value === "object" &&
        value !== null &&
        "run" in value &&
        typeof value.run === "function"
      );
    }
    const injected: unknown = Reflect.get(window, "axe");
    if (!isAxeRuntime(injected)) {
      throw new Error("The accessibility auditor did not load.");
    }
    const result = await injected.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return result.violations.flatMap((rule) =>
      rule.nodes.map(
        (node) =>
          `${rule.id}: ${node.target.join(" ")}\n${node.failureSummary}`,
      ),
    );
  });
}
