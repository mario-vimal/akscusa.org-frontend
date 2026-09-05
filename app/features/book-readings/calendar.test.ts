import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reading } from "~/features/books/test-fixtures";
import { isUpcoming } from "~/lib/collection-policy";
import { currentReading, isUpcomingReading } from "./calendar";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T07:00:00-07:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe.each(["UTC", "America/Los_Angeles", "Asia/Kolkata"])(
  "reading-day policy on a %s build",
  (zone) => {
    it("does not let yesterday's late reading displace the September 19 session", () => {
      vi.stubEnv("TZ", zone);
      const yesterday = reading("yesterday", "2026-09-04T19:00:00-07:00");
      const next = reading("september-19", "2026-09-19T15:00:00-07:00");
      const later = reading("later", "2026-10-19T15:00:00-07:00");

      // This is why the UTC date-only policy cannot classify timed readings.
      expect(isUpcoming(yesterday)).toBe(true);
      expect(isUpcomingReading(yesterday)).toBe(false);
      expect(currentReading([later, next, yesterday])).toBe(next);
    });

    it("preserves the existing whole-day policy even after the session's hour", () => {
      vi.stubEnv("TZ", zone);
      const today = reading("today", "2026-09-05T00:30:00-07:00");
      expect(isUpcomingReading(today)).toBe(true);
      vi.setSystemTime(new Date("2026-09-06T06:59:59.999Z"));
      expect(isUpcomingReading(today)).toBe(true);
      vi.setSystemTime(new Date("2026-09-06T07:00:00Z"));
      expect(isUpcomingReading(today)).toBe(false);
    });

    it("does not advance the reading day early at UTC midnight", () => {
      vi.stubEnv("TZ", zone);
      vi.setSystemTime(new Date("2026-09-05T01:00:00Z"));
      expect(
        isUpcomingReading(reading("today", "2026-09-04T15:00:00-07:00")),
      ).toBe(true);
    });

    it.each([
      [
        "spring forward",
        "2026-03-08T01:30:00-08:00",
        "2026-03-09T06:59:59.999Z",
        "2026-03-09T07:00:00Z",
      ],
      [
        "fall back",
        "2026-11-01T01:30:00-07:00",
        "2026-11-02T07:59:59.999Z",
        "2026-11-02T08:00:00Z",
      ],
    ])(
      "uses the correct next midnight on the %s day",
      (_name, date, before, after) => {
        vi.stubEnv("TZ", zone);
        const session = reading("dst", date);
        vi.setSystemTime(new Date(before));
        expect(isUpcomingReading(session)).toBe(true);
        vi.setSystemTime(new Date(after));
        expect(isUpcomingReading(session)).toBe(false);
      },
    );
  },
);

describe("currentReading", () => {
  it("uses stable ID ordering for equally dated upcoming and past sessions", () => {
    const a = reading("a", "2026-09-19T15:00:00-07:00");
    const z = reading("z", "2026-09-19T15:00:00-07:00");
    expect(currentReading([z, a])).toBe(a);
    expect(currentReading([a, z])).toBe(a);

    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    expect(currentReading([z, a])).toBe(a);
    expect(currentReading([a, z])).toBe(a);
  });

  it("chooses the latest held session when no future one is scheduled", () => {
    const old = reading("old", "2025-09-04T19:00:00-07:00");
    const latest = reading("latest", "2026-09-04T19:00:00-07:00");
    expect(currentReading([old, latest])).toBe(latest);
  });

  it("handles empty input and never sorts the caller's array in place", () => {
    expect(currentReading([])).toBeUndefined();
    const next = reading("next", "2026-09-19T15:00:00-07:00");
    const later = reading("later", "2026-10-19T15:00:00-07:00");
    const entries = Object.freeze([later, next]);
    expect(currentReading(entries)).toBe(next);
    expect(entries).toEqual([later, next]);
  });
});
