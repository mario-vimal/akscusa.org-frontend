import { expect, publishedPaths, test, visit } from "./fixtures";

test("reading filters announce an empty state and clear back to the complete log", async ({
  page,
}) => {
  await visit(page, "/book-readings/");
  const entries = page.locator("[data-log-entry]:visible");
  const total = await entries.count();
  test.skip(total === 0, "The published reading log is empty.");
  const input = page.locator("[data-log-search]");
  await input.fill("__quality_gate_no_matching_reading__");
  await expect(entries).toHaveCount(0);
  await expect(page.locator("[data-log-empty]")).toBeVisible();
  await page.locator("[data-log-clear]").click();
  await expect(entries).toHaveCount(total);
  await expect(input).toBeFocused();

  const facet = page.locator("[data-log-facet]").first();
  if (await facet.count()) {
    const value = await facet.locator("option").nth(1).getAttribute("value");
    if (value === null) throw new Error("The reading facet has no value.");
    await facet.selectOption(value);
    expect(await entries.count()).toBeGreaterThan(0);
    expect(await entries.count()).toBeLessThan(total);
  }
});

test("editorial filter choices survive a shared URL and reload", async ({
  page,
}) => {
  await visit(page, "/blog/");
  const chip = page
    .locator('[data-filter-value]:not([data-filter-value="all"])')
    .first();
  test.skip((await chip.count()) === 0, "The blog has no category filters.");
  const value = await chip.getAttribute("data-filter-value");
  if (!value) throw new Error("The category chip has no value.");
  await chip.click();
  expect(new URL(page.url()).searchParams.get("category")).toBe(value);
  const visible = await page
    .locator("[data-filter-term]:not([data-filter-lead]):visible")
    .count();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(`[data-filter-value="${value}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.locator("[data-filter-term]:not([data-filter-lead]):visible"),
  ).toHaveCount(visible);
});

test("posters enlarge in place and return focus on dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await visit(page, "/anti-caste-helpline/");
  const opener = page.locator("[data-poster-open]").first();
  await opener.click();
  const dialog = page.locator(".poster-viewer");
  await expect(dialog).toBeVisible();
  await expect(page.locator(".poster-viewer__close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.mouse.click(2, 300);
  await expect(dialog).toBeHidden();
  expect(new URL(page.url()).pathname).toBe("/anti-caste-helpline/");
});

test("comic paging keeps keyboard focus at both ends and restores the last panel", async ({
  page,
}) => {
  const paths = await publishedPaths(page);
  const path = paths.find((path) => /^\/comics\/[^/]+\/$/.test(path));
  test.skip(path === undefined, "No comic is published.");
  if (!path) return;
  await visit(page, path);
  const openers = page.locator("[data-panel-open]");
  const total = await openers.count();
  await openers.first().click();
  await expect(page.locator("[data-panel-previous]")).toBeDisabled();
  await page.locator("[data-panel-next]").focus();
  for (let index = 1; index < total; index++)
    await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-panel-next]")).toBeDisabled();
  if (total > 1) await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Escape");
  await expect(openers.nth(Math.max(0, total - 2))).toBeFocused();
  await page.locator("[data-transcripts-toggle]").click();
  await expect(page.locator(".panel__transcript[open]")).toHaveCount(total);
});

test("flyer focus remains visible with reduced motion", async ({ page }) => {
  await visit(page, "/book-readings/");
  const opener = page.locator(".poster-stack__open").first();
  test.skip((await opener.count()) === 0, "No reading flyers are published.");
  await page.keyboard.press("Tab");
  await opener.focus();
  const indicator = await opener.evaluate((element) => {
    const tile = element.closest(".poster-stack__tile");
    if (!tile) throw new Error("The flyer has no containing tile.");
    return {
      focused: element.matches(":focus-visible"),
      style: getComputedStyle(tile).outlineStyle,
      width: Number.parseFloat(getComputedStyle(tile).outlineWidth),
    };
  });
  expect(indicator.focused).toBe(true);
  expect(indicator.style).not.toBe("none");
  expect(indicator.width).toBeGreaterThanOrEqual(2);
});
