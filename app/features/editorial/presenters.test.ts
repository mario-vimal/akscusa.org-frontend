import { afterEach, describe, expect, it, vi } from "vitest";

import { conferenceDetails } from "./presenters";
import { conference } from "./test-fixtures";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe.each(["UTC", "America/Los_Angeles"])(
  "conference calendar wording on a %s build",
  (zone) => {
    it("keeps registration through the entire single conference day", () => {
      vi.stubEnv("TZ", zone);
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-19T23:59:59.999Z"));
      const details = conferenceDetails(
        conference("one-day", "2026-09-19", {
          registrationUrl: "https://example.org/conference",
        }),
      );
      expect(details).toContainEqual({
        term: "Registration",
        description: "Register and see full details",
        href: "https://example.org/conference",
      });
    });

    it("uses the effective final day for a multi-day conference", () => {
      vi.stubEnv("TZ", zone);
      vi.useFakeTimers();
      const event = conference("multi-day", "2026-09-18", {
        endDate: new Date("2026-09-20"),
        registrationUrl: "https://example.org/conference",
      });
      for (const instant of [
        "2026-09-19T12:00:00Z",
        "2026-09-20T00:00:00Z",
        "2026-09-20T23:59:59.999Z",
      ]) {
        vi.setSystemTime(new Date(instant));
        expect(conferenceDetails(event).at(-1)?.term).toBe("Registration");
      }
      vi.setSystemTime(new Date("2026-09-21T00:00:00Z"));
      expect(conferenceDetails(event).at(-1)).toEqual({
        term: "Programme",
        description: "Full details and speakers",
        href: "https://example.org/conference",
      });
    });

    it("does not invent a registration destination", () => {
      expect(
        conferenceDetails(conference("unconfirmed", "2026-09-19")),
      ).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ term: "Registration" }),
        ]),
      );
    });
  },
);
