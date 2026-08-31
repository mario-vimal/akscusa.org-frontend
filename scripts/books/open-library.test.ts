import { describe, expect, it } from "vitest";

import { authorKeys, coverUrl, lookupKeys } from "./open-library.ts";

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
