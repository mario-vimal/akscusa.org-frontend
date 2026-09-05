import { expect, publishedPaths, test, visit } from "./fixtures";

test("a focused carousel stays paused after the pointer leaves", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await visit(page, "/");
  const carousel = page.locator('[data-carousel-noun="quotation"]');
  await carousel.scrollIntoViewIfNeeded();
  const viewport = carousel.locator("[data-carousel-viewport]");
  await viewport.focus();
  await carousel.hover();
  const before = await viewport.evaluate((element) => element.scrollLeft);
  await page.mouse.move(0, 0);
  await expect(viewport).toBeFocused();
  await page.clock.runFor(7_000);
  await page.waitForTimeout(500);
  expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(before);
});

test("reduced motion starts carousels without automatic rotation", async ({
  page,
}) => {
  await page.clock.install();
  await visit(page, "/");
  const viewport = page.locator(
    '[data-carousel-noun="quotation"] [data-carousel-viewport]',
  );
  const before = await viewport.evaluate((element) => element.scrollLeft);
  await page.clock.runFor(13_000);
  expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(before);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("navigation, full content, and transcripts remain usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/", { waitUntil: "load" });
    await page.locator("[data-mobile-nav] > summary").click();
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await expect(page.locator("[data-carousel-controls]:visible")).toHaveCount(
      0,
    );
    await page.goto("/book-readings/", { waitUntil: "load" });
    await expect(page.locator("[data-log-controls]")).toBeHidden();

    const paths = await publishedPaths(page);
    const comic = paths.find((path) => /^\/comics\/[^/]+\/$/.test(path));
    if (comic) {
      await page.goto(comic, { waitUntil: "load" });
      await expect(page.locator("[data-panel-open]:visible")).toHaveCount(0);
      const transcript = page.locator(".panel__transcript").first();
      await transcript.locator("summary").click();
      await expect(transcript).toHaveAttribute("open", "");
    }
  });

  test("editorial filters never appear as dead buttons", async ({ page }) => {
    for (const path of ["/blog/", "/interventions/"]) {
      await page.goto(path, { waitUntil: "load" });
      await expect(page.locator("[data-filter-value]:visible")).toHaveCount(0);
    }
  });
});
