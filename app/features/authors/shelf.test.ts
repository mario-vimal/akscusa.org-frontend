import { describe, expect, it } from "vitest";

import { book, reading } from "~/features/books/test-fixtures";
import { byLatestSession } from "./shelf";

describe("author shelf ordering", () => {
  it("stabilizes books whose latest session dates tie", () => {
    const a = {
      ...book("a"),
      readings: [reading("sitting-a", "2026-09-19T15:00:00-07:00")],
    };
    const z = {
      ...book("z"),
      readings: [reading("sitting-z", "2026-09-19T15:00:00-07:00")],
    };
    expect([z, a].sort(byLatestSession).map((entry) => entry.book.id)).toEqual([
      "a",
      "z",
    ]);
    expect([a, z].sort(byLatestSession).map((entry) => entry.book.id)).toEqual([
      "a",
      "z",
    ]);
  });

  it("uses the latest session, not the first loaded session", () => {
    const newest = {
      ...book("newest"),
      readings: [
        reading("old", "2020-01-01T15:00:00-08:00"),
        reading("latest", "2026-09-19T15:00:00-07:00"),
      ],
    };
    const older = {
      ...book("older"),
      readings: [reading("older", "2025-01-01T15:00:00-08:00")],
    };
    expect([older, newest].sort(byLatestSession)[0]).toBe(newest);
  });

  it("places unscheduled books after session records with deterministic title ties", () => {
    const a = { ...book("a", { title: "The same title" }), readings: [] };
    const z = { ...book("z", { title: "The same title" }), readings: [] };
    const scheduled = {
      ...book("scheduled"),
      readings: [reading("future", "2026-09-19T15:00:00-07:00")],
    };
    expect(
      [z, a, scheduled].sort(byLatestSession).map((entry) => entry.book.id),
    ).toEqual(["scheduled", "a", "z"]);
  });
});
