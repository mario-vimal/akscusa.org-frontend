import { describe, expect, it } from "vitest";

import { byTermLabel, termLabels, termsInUse, type Term } from "./vocabulary";

describe("editorial vocabulary", () => {
  it("uses English ordering for accented labels instead of the host locale", () => {
    const terms: Term[] = [
      { id: "z", label: "Zulu" },
      { id: "ang", label: "Ångström" },
      { id: "egalite", label: "Égalité" },
      { id: "ambedkar", label: "Ambedkar" },
    ];
    expect(terms.sort(byTermLabel).map((term) => term.id)).toEqual([
      "ambedkar",
      "ang",
      "egalite",
      "z",
    ]);
  });

  it("breaks equal-label ties by stable ID", () => {
    const a = { id: "a", label: "Caste" };
    const z = { id: "z", label: "Caste" };
    expect([z, a].sort(byTermLabel)).toEqual([a, z]);
    expect([a, z].sort(byTermLabel)).toEqual([a, z]);
  });

  it("does not offer unused terms or discard vocabulary order", () => {
    const terms = [
      { id: "b", label: "Second" },
      { id: "a", label: "First" },
      { id: "unused", label: "Unused" },
    ];
    expect(termsInUse(terms, ["a", "b", "removed"], (id) => id)).toEqual(
      terms.slice(0, 2),
    );
    expect(termsInUse(terms, [], (id: string) => id)).toEqual([]);
  });

  it("falls back to a stored ID when a vocabulary entry has been removed", () => {
    const label = termLabels([{ id: "caste", label: "Caste" }]);
    expect(label("caste")).toBe("Caste");
    expect(label("removed")).toBe("removed");
    expect(termLabels([])("missing")).toBe("missing");
  });
});
