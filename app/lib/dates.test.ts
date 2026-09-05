import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateRange,
  formatPacificDate,
  formatPacificMonthRange,
  formatPacificShortDate,
  formatPacificTime,
  isoDate,
  isoPacificDate,
  pacificYear,
} from "./dates";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(["UTC", "America/Los_Angeles", "Asia/Kolkata"])(
  "explicit calendar formats on a %s build",
  (zone) => {
    it("keeps UTC editorial dates distinct from Pacific reading dates", () => {
      vi.stubEnv("TZ", zone);
      const instant = new Date("2026-01-01T02:00:00Z");
      expect(isoDate(instant)).toBe("2026-01-01");
      expect(isoPacificDate(instant)).toBe("2025-12-31");
      expect(formatDate(instant)).toBe("January 1, 2026");
      expect(formatPacificDate(instant)).toBe("December 31, 2025");
      expect(formatPacificShortDate(instant)).toBe("Dec 31, 2025");
      expect(pacificYear(instant)).toBe(2025);
    });

    it("formats the scheduled September appointment without changing its hour", () => {
      vi.stubEnv("TZ", zone);
      expect(formatPacificTime(new Date("2026-09-19T15:00:00-07:00"))).toBe(
        "September 19, 2026 at 3:00 PM PDT",
      );
      expect(formatPacificTime(new Date("2026-01-19T15:00:00-08:00"))).toBe(
        "January 19, 2026 at 3:00 PM PST",
      );
    });

    it("uses Pacific month and year boundaries for reading runs", () => {
      vi.stubEnv("TZ", zone);
      expect(
        formatPacificMonthRange(
          new Date("2026-01-01T02:00:00Z"),
          new Date("2026-02-01T02:00:00Z"),
        ),
      ).toBe("December 2025 – January 2026");
    });
  },
);

it("gives both occurrences of the fall-back hour the same Pacific day", () => {
  expect(isoPacificDate(new Date("2026-11-01T01:30:00-07:00"))).toBe(
    "2026-11-01",
  );
  expect(isoPacificDate(new Date("2026-11-01T01:30:00-08:00"))).toBe(
    "2026-11-01",
  );
});

it("prints date-only conference ranges without shifting their days", () => {
  expect(formatDateRange(new Date("2026-09-19"), new Date("2026-09-20"))).toBe(
    "September 19, 2026 – September 20, 2026",
  );
  expect(formatDateRange(new Date("2026-09-19"), new Date("2026-09-19"))).toBe(
    "September 19, 2026",
  );
});
