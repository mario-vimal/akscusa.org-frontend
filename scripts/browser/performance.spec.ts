import { expect, test } from "./fixtures";

interface Shift {
  time: number;
  value: number;
}

test("the helpline stays stable while cold mobile fonts load", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Network/CPU emulation requires CDP.");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    const values: Shift[] = [];
    Object.defineProperty(window, "qualityLayoutShifts", { value: values });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          "hadRecentInput" in entry &&
          entry.hadRecentInput === false &&
          "value" in entry &&
          typeof entry.value === "number"
        ) {
          values.push({ time: entry.startTime, value: entry.value });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 75_000,
    connectionType: "cellular4g",
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/anti-caste-helpline/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const shifts = await page.evaluate(() => {
    const measured: unknown = Reflect.get(window, "qualityLayoutShifts");
    if (!Array.isArray(measured)) {
      throw new Error("The layout-shift observer did not initialize.");
    }
    const shifts: Shift[] = [];
    for (const item of measured) {
      const value: unknown = item;
      if (
        !value ||
        typeof value !== "object" ||
        !("time" in value) ||
        typeof value.time !== "number" ||
        !("value" in value) ||
        typeof value.value !== "number"
      ) {
        throw new Error("The layout-shift observer returned invalid data.");
      }
      shifts.push({ time: value.time, value: value.value });
    }
    return shifts;
  });

  // CLS is the largest burst, not a sum over an arbitrarily long page visit.
  let start: number | undefined;
  let previous = 0;
  let current = 0;
  let largest = 0;
  for (const shift of shifts) {
    if (
      start === undefined ||
      shift.time - previous > 1_000 ||
      shift.time - start > 5_000
    ) {
      start = shift.time;
      current = 0;
    }
    current += shift.value;
    largest = Math.max(largest, current);
    previous = shift.time;
  }
  expect(largest, JSON.stringify(shifts)).toBeLessThanOrEqual(0.1);
});
