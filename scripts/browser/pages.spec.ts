import {
  accessibilityFailures,
  expect,
  publishedPaths,
  representativePaths,
  test,
  visit,
} from "./fixtures";

for (const width of [320, 375, 768, 1440]) {
  test(`published layouts fit at ${width}px`, async ({ page, browserName }) => {
    test.setTimeout(120_000);
    const paths = await publishedPaths(page);
    const inspected =
      browserName === "chromium" ? paths : representativePaths(paths);
    await page.setViewportSize({ width, height: 900 });

    for (const path of inspected) {
      await visit(page, path);
      await expect.soft(page.locator("main"), path).toHaveCount(1);
      await expect.soft(page.locator("h1"), path).toHaveCount(1);
      const layout = await page.evaluate(() => {
        const ids = [...document.querySelectorAll("[id]")].map(
          (element) => element.id,
        );
        return {
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
        };
      });
      expect
        .soft(layout.scrollWidth, path)
        .toBeLessThanOrEqual(layout.width + 1);
      expect.soft(layout.duplicateIds, path).toEqual([]);
    }
  });
}

for (const width of [320, 1440]) {
  test(`published pages meet automated accessibility rules at ${width}px`, async ({
    page,
    browserName,
  }) => {
    test.setTimeout(180_000);
    const paths = await publishedPaths(page);
    const inspected =
      width === 1440 && browserName === "chromium"
        ? paths
        : representativePaths(paths);
    await page.setViewportSize({ width, height: 900 });

    for (const path of inspected) {
      await visit(page, path);
      expect.soft(await accessibilityFailures(page), path).toEqual([]);
    }
  });
}

test("representative pages reflow with 200 percent text", async ({ page }) => {
  test.setTimeout(90_000);
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/anti-caste-helpline/",
      "/book-readings/",
      "/who-said-what/",
    ]) {
      await visit(page, path);
      await page.addStyleTag({
        content: "html { font-size: 200% !important; }",
      });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect
        .soft(layout.scrollWidth, `${path} at ${width}px with 200% text`)
        .toBeLessThanOrEqual(layout.width + 1);
    }
  }
});

test("unknown routes return a branded 404 with recovery links", async ({
  page,
}) => {
  const response = await page.goto("/quality-gate-missing-page/", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
  await expect(page.locator("main h1")).toContainText("This page is not here");
  await expect(
    page.locator('main a[href="/anti-caste-helpline/"]'),
  ).toHaveCount(1);
});

test("the testimony action reaches the existing submission form", async ({
  page,
}) => {
  await visit(page, "/testimonies-of-practice-of-caste-in-the-usa/");
  await expect(
    page.getByRole("link", { name: "Share your testimony", exact: true }),
  ).toHaveAttribute("href", "https://bit.ly/CasteInUsa");
});

test("sharing metadata names the actual page and a local brand image", async ({
  page,
}) => {
  await visit(page, "/");
  const title = await page.title();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    title,
  );
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonical ?? "",
  );
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toBeTruthy();
  const response = await page.request.get(new URL(image ?? "").pathname);
  await expect(response).toBeOK();
});
