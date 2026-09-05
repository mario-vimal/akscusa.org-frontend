import { expect, test, visit } from "./fixtures";

test("helpline access has a named landmark", async ({ page }) => {
  await visit(page, "/");
  const region = page.getByRole("region", { name: "Anti-Caste Helpline" });
  await expect(region).toBeVisible();
  await expect(region.locator('a[href^="tel:"]')).toHaveCount(1);
});

test("skip navigation continues inside main content", async ({ page }) => {
  await visit(page, "/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("href", "#main-content");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  expect(
    await page
      .locator(":focus")
      .evaluate((element) => element.closest("main") !== null),
  ).toBe(true);
});

for (const width of [320, 375, 768]) {
  test(`the whole mobile menu is reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await visit(page, "/");
    const summary = page.locator("[data-mobile-nav] > summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const sheet = page.locator("[data-mobile-nav] > div");
    await expect(sheet).toBeVisible();
    const lastLink = sheet.locator("a").last();
    await sheet.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const bottom = await lastLink.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    );
    expect(bottom).toBeLessThanOrEqual(801);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(summary).toBeFocused();
  });
}

test("hiding the mobile menu at desktop releases scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await visit(page, "/");
  await page.locator("[data-mobile-nav] > summary").click();
  await expect(page.locator("[data-mobile-nav] > div")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 800 });
  await expect(page.locator("[data-mobile-nav]")).toBeHidden();
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
});

test("desktop menus support keyboard opening and Escape", async ({ page }) => {
  await visit(page, "/");
  const summary = page.locator("[data-nav-menu] > summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(summary.locator("..")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(summary.locator("..")).not.toHaveAttribute("open", "");
  await expect(summary).toBeFocused();
});
