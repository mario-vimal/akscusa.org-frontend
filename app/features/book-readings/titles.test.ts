import { describe, expect, it } from "vitest";

import { sessionLabel } from "./titles";

describe("sessionLabel", () => {
  it("takes the book off the front of a session title", () => {
    expect(
      sessionLabel("The Will to Change: Chapters 1 – 4", "The Will to Change"),
    ).toBe("Chapters 1 – 4");
    expect(
      sessionLabel(
        "By Any Means Necessary: Chapters 1 & 2",
        "By Any Means Necessary",
      ),
    ).toBe("Chapters 1 & 2");
  });

  it("handles a comma or a dash as the separator", () => {
    expect(
      sessionLabel("Annihilation of Caste, continued", "Annihilation of Caste"),
    ).toBe("Continued");
    expect(
      sessionLabel(
        "Buffalo Nationalism - Chapters 34 - 42",
        "Buffalo Nationalism",
      ),
    ).toBe("Chapters 34 - 42");
  });

  it("gives a remainder that starts mid-sentence its capital back", () => {
    expect(
      sessionLabel("Annihilation of Caste, revisited", "Annihilation of Caste"),
    ).toBe("Revisited");
  });

  it("has nothing to add when the session is titled after the book alone", () => {
    expect(
      sessionLabel("Waiting for a Visa", "Waiting for a Visa"),
    ).toBeUndefined();
  });

  it("has nothing to add when the session title is the book and its subtitle", () => {
    expect(
      sessionLabel(
        "Ambedkar: Towards an Enlightened India",
        "Ambedkar",
        "towards an enlightened India",
      ),
    ).toBeUndefined();
  });

  it("keeps a label that only happens to sit beside a subtitle", () => {
    expect(
      sessionLabel(
        "Caste Pride: Chapters 15 – 18",
        "Caste Pride",
        "Battles for Equality in Hindu India",
      ),
    ).toBe("Chapters 15 – 18");
  });

  it("ignores the capitals an editor typed", () => {
    expect(
      sessionLabel("Why were Women enslaved?", "Why Were Women Enslaved?"),
    ).toBeUndefined();
  });

  it("keeps the whole title when the session is not named after its book", () => {
    expect(sessionLabel("Riddles 1 – 8", "Riddles in Hinduism")).toBe(
      "Riddles 1 – 8",
    );
  });

  it("keeps the whole title for a session with no book", () => {
    expect(sessionLabel("Palestine – A reading list")).toBe(
      "Palestine – A reading list",
    );
  });

  it("has nothing to show for an empty title", () => {
    expect(sessionLabel("   ")).toBeUndefined();
  });
});
