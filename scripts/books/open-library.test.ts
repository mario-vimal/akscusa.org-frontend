import { afterEach, describe, expect, it, vi } from "vitest";

import {
  authorKeys,
  coverUrl,
  fetchCover,
  fetchRecord,
  lookupKeys,
} from "./open-library.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lookupKeys", () => {
  it("tries the ISBN-13 first and its ISBN-10 second", () => {
    expect(lookupKeys("978-81-89059-63-7")).toEqual([
      "9788189059637",
      "8189059637",
    ]);
  });

  it("has only one key for a 979 ISBN, which has no ISBN-10", () => {
    expect(lookupKeys("9798190357936")).toEqual(["9798190357936"]);
  });
});

describe("coverUrl", () => {
  it("asks for the large cover and refuses the placeholder", () => {
    expect(coverUrl("9788189059637")).toBe(
      "https://covers.openlibrary.org/b/isbn/9788189059637-L.jpg?default=false",
    );
  });
});

describe("authorKeys", () => {
  it("reads the keys an edition names directly", () => {
    expect(authorKeys([{ key: "/authors/OL1234A" }])).toEqual([
      "/authors/OL1234A",
    ]);
  });

  it("reads the keys a work wraps in an author field", () => {
    expect(
      authorKeys([{ author: { key: "/authors/OL1234A" }, type: {} }]),
    ).toEqual(["/authors/OL1234A"]);
  });

  it("ignores anything that is not an author record", () => {
    expect(authorKeys([{ key: "/works/OL99W" }, "OL1234A", null])).toEqual([]);
    expect(authorKeys(undefined)).toEqual([]);
  });
});

// Open Library answers an overloaded or rate-limited request with an HTML
// error page rather than JSON, and a dropped connection truncates a body that
// began fine. Either would reject while the body is read, which is outside the
// request itself, so these guard the whole run against dying on one book.
describe("a response whose body cannot be read", () => {
  const unreadable = (field: string) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          [field]: () => Promise.reject(new Error("Unexpected token <")),
        }),
      ),
    );
  };

  it("leaves the record empty rather than throwing", async () => {
    unreadable("json");

    await expect(fetchRecord("9788189059637")).resolves.toEqual({});
  });

  it("leaves the cover missing rather than throwing", async () => {
    unreadable("arrayBuffer");

    await expect(fetchCover("9788189059637")).resolves.toBeUndefined();
  });
});
