import { afterEach, describe, expect, it, vi } from "vitest";

import {
  byId,
  byNewestFirst,
  bySoonestFirst,
  isUpcoming,
  startOfToday,
} from "./collection-policy";

const dated = (id: string, date: string) => ({
  id,
  data: { date: new Date(date) },
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("dated collection ordering", () => {
  const a = dated("a", "2026-09-05");
  const z = dated("z", "2026-09-05");
  const earlier = dated("earlier", "2026-09-04");
  const later = dated("later", "2026-09-06");

  it("sorts archives by date, breaking ties by ID in either loader order", () => {
    for (const entries of [
      [z, earlier, a, later],
      [a, later, z, earlier],
    ]) {
      expect(entries.sort(byNewestFirst).map((entry) => entry.id)).toEqual([
        "later",
        "a",
        "z",
        "earlier",
      ]);
    }
  });

  it("keeps the same ID tie-breaker for upcoming lists instead of reversing it", () => {
    for (const entries of [
      [z, earlier, a, later],
      [a, later, z, earlier],
    ]) {
      expect(entries.sort(bySoonestFirst).map((entry) => entry.id)).toEqual([
        "earlier",
        "a",
        "z",
        "later",
      ]);
    }
  });

  it("treats identical identities and dates as equal", () => {
    expect(byNewestFirst(a, a)).toBe(0);
    expect(bySoonestFirst(a, a)).toBe(0);
    expect(byId(a, a)).toBe(0);
  });
});

describe.each(["UTC", "America/Los_Angeles", "Asia/Kolkata"])(
  "date-only editorial policy on a %s build",
  (zone) => {
    it("uses UTC midnight, not the build host's local midnight", () => {
      vi.stubEnv("TZ", zone);
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-05T01:00:00Z"));
      expect(startOfToday().toISOString()).toBe("2026-09-05T00:00:00.000Z");
      expect(isUpcoming(dated("today", "2026-09-05"))).toBe(true);
      expect(isUpcoming(dated("yesterday", "2026-09-04"))).toBe(false);
    });

    it("keeps a date-only record current until its next UTC day begins", () => {
      vi.stubEnv("TZ", zone);
      vi.useFakeTimers();
      const entry = dated("year-end", "2026-12-31");
      vi.setSystemTime(new Date("2026-12-31T23:59:59.999Z"));
      expect(isUpcoming(entry)).toBe(true);
      vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
      expect(isUpcoming(entry)).toBe(false);
    });
  },
);
