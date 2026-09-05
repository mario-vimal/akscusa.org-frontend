import { z } from "astro/zod";
import { describe, expect, it } from "vitest";

import { readingDate } from "~/schemas/shared";
import { readContentCollection } from "./collection";
import { parseFrontmatter } from "./frontmatter";

const dates = z.object({ date: readingDate });

describe("authored reading dates", () => {
  it("checks raw YAML before Astro can coerce an ambiguous timestamp to a Date", () => {
    expect(() => readContentCollection("book-readings", dates)).not.toThrow();
  });

  it("rejects both quoted and unquoted timestamps that omit their timezone", () => {
    for (const value of ["2026-09-19T15:00:00", '"2026-09-19T15:00:00"']) {
      expect(() =>
        parseFrontmatter(`---\ndate: ${value}\n---\n`, dates),
      ).toThrow();
    }
  });

  it.each(["2026-09-19", '"2026-09-19"'])(
    "rejects a date-only reading before YAML/Astro can invent midnight: %s",
    (value) => {
      expect(() =>
        parseFrontmatter(`---\ndate: ${value}\n---\n`, dates),
      ).toThrow();
    },
  );
});
