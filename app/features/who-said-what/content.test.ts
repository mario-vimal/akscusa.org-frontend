import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

import { whoSaidWhatPageSchema } from "~/schemas/pages";
import { presentGame } from "./presenters";

vi.mock("astro:content", () => ({
  defineCollection: (collection: unknown) => collection,
}));
vi.mock("astro/loaders", () => ({ glob: () => ({}) }));

const markdown = readFileSync(
  "app/content/pages/who-said-what/index.md",
  "utf8",
);
const frontmatter = /^---\n([\s\S]*?)\n---/.exec(markdown);
if (!frontmatter?.[1]) throw new Error("The game's frontmatter is missing.");

const rawCopy: unknown = parse(frontmatter[1]);
const copy = whoSaidWhatPageSchema.parse(rawCopy);
const [firstQuestion] = copy.questions;
if (!firstQuestion) throw new Error("The first game question is missing.");

const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
const fingerprint = (text: string) =>
  createHash("sha256").update(text).digest("hex");

describe("the complete September 2023 resource", () => {
  it("preserves the original title, opening and introductory paragraphs", () => {
    expect(copy.title).toBe("Who said What?!");
    expect(copy.lede).toBe(
      "Let’s have some fun with a baby shower game to celebrate the birth of a Law! 🎉",
    );
    expect(copy.description).toBe(
      "Discover how Civil Rights laws are made in the USA!",
    );
    expect(copy.gameHeading).toBe("Game on!");
    expect(fingerprint(normalized(markdown.slice(frontmatter[0].length)))).toBe(
      "a7c7ff2bc8d4204cecf538f9dada4cc09b576724e17906cf3e675bfa31eb54a3",
    );
  });

  it("retains every question, choice, quotation, explanation and reference text", () => {
    // These fingerprints came from the recovered source, not from the new
    // frontmatter. Pinning the complete text catches truncated hidden feedback.
    const expected = [
      "de9b1133f19d68c844ab98fd7c73cf615a5be202a7b536fed944f122b1fb17da",
      "8829fe282667222524e62474306b6f98b29f841160af73794d028406e6d2fb4f",
      "87a78efb21f18353d9c79d479401d4cd1828e1aad1ede35dc59cc75482aba5b1",
      "83815a831f00a7f9e843b1a5fbe596e0f5fabc41a1a702fe2ae3af0279cbdb9c",
      "970f52b4ec143c1c791bfc46675d765a5537d73c19355a824a145ffcc70a3eec",
    ];
    expect(
      copy.questions.map((question) =>
        fingerprint(
          JSON.stringify([
            question.prompt,
            question.quotes,
            question.choices,
            question.explanation,
            question.references.map((reference) =>
              normalized(
                [reference.before, reference.label, reference.after]
                  .filter(Boolean)
                  .join(" "),
              ),
            ),
          ]),
        ),
      ),
    ).toEqual(expected);
  });

  it("preserves the answer key and the original checkbox/radio distinction", () => {
    // Watu.showAnswer marks php-answer-label as correct. Every source choice
    // has that class except question three's second choice.
    expect(copy.questions.map((question) => question.answer)).toEqual([
      "both",
      "both",
      "first",
      "both",
      "both",
    ]);
    expect(
      presentGame(copy).questions.map((question) => question.inputType),
    ).toEqual(["checkbox", "checkbox", "radio", "checkbox", "checkbox"]);
  });

  it("labels the original wording as historical rather than current bill status", () => {
    expect(presentGame(copy).dateLabel).toBe("September 2023");
    expect(copy.archiveNote).toContain("not its current status");
    expect(copy.noScriptInstructions).toContain("Show answer and explanation");
  });

  it("keeps all nine citations, including repeated sources in their question context", () => {
    expect(
      copy.questions.map((question) => question.references.length),
    ).toEqual([2, 3, 2, 0, 2]);
    expect(
      copy.questions.flatMap((question) =>
        question.references.map((reference) => reference.href),
      ),
    ).toEqual([
      "https://en.wikisource.org/wiki/Strom_Thurmond_filibuster_on_the_Civil_Rights_Act_of_1957",
      "https://www.hinduamerican.org/wp-content/uploads/2023/04/HAFs-Opposition-Letter-to-Amended-SB-403-.pdf",
      "https://en.wikisource.org/wiki/Strom_Thurmond_filibuster_on_the_Civil_Rights_Act_of_1957",
      "https://youtu.be/_kaS2nhqpsY?si=rlI5Y4E9ps2UKpt2",
      "https://x.com/CityofCupertino/status/1683510888933003267?s=20",
      "https://www.theguardian.com/world/2017/aug/27/george-lincoln-rockwell-american-nazi-party-alt-right-charlottesville",
      "https://youtu.be/_kaS2nhqpsY?si=rlI5Y4E9ps2UKpt2",
      "https://www.hinduamerican.org/wp-content/uploads/2023/04/HAFs-Opposition-Letter-to-Amended-SB-403-.pdf",
      "https://americankahani.com/perspectives/i-am-a-dominant-caste-hindu-id-like-to-debunk-casteist-disinformation-about-californias-sb-403/",
    ]);
  });
});

describe("the six original photographs", () => {
  const photos = [
    copy.photo,
    ...copy.questions.map((question) => question.photo),
  ];
  const assets = "app/content/pages/who-said-what/assets";

  it("keeps every described image beside its owning entry with no missing or unused assets", () => {
    expect(photos).toHaveLength(6);
    expect(photos.map((photo) => photo.file).sort()).toEqual(
      readdirSync(assets).sort(),
    );
    for (const photo of photos) {
      expect(existsSync(`${assets}/${photo.file}`)).toBe(true);
      expect(photo.alt.trim()).not.toBe("");
    }
  });

  it("preserves the recovered image bytes when moving their storage location", () => {
    expect(
      photos.map((photo) =>
        createHash("sha256")
          .update(readFileSync(`${assets}/${photo.file}`))
          .digest("hex"),
      ),
    ).toEqual([
      "2854c19e29fd7263e67c7c2ce6cc8a8e6cd4a8a8fbaf0ed73725866630355d7b",
      "3d71f7f0d41cc75c6d07006b0610e5947a3a2fa8efc33b42badbe3b4f744e0a4",
      "59722ccd9269947e58f271c41d05d387fc921800ba9c90eadcdcc4944d757dbd",
      "8fb1f67aec2c52e1a87549958bdb6918617aebf56e918a5f4c4138db0adc0814",
      "6bb190cc38a0b79cdbb5d2c481fecafdb31ff4da48cd1b9cf864c337a68cbf93",
      "8a4b1e45b03fb8360251fbd163f7d7b7dbb0d5d3f50408471d71946b3c9b1297",
    ]);
  });

  it("retains every photographer and the original Unsplash image identities", () => {
    expect(
      photos.map((photo) => [photo.credit.name, photo.credit.source]),
    ).toEqual([
      ["Zoe VandeWater", "https://unsplash.com/photos/d4psO9Z5pY0"],
      ["Jason Leung", "https://unsplash.com/photos/XigshA91R6M"],
      ["Clay Banks", "https://unsplash.com/photos/N32JLRTANCQ"],
      ["engin akyurt", "https://unsplash.com/photos/vYqAHQNaOis"],
      ["Brett Jordan", "https://unsplash.com/photos/8uJcdo1OS1M"],
      ["Tingey Injury Law Firm", "https://unsplash.com/photos/yCdPU73kGSc"],
    ]);
    expect(photos.map((photo) => photo.credit.profile)).toEqual([
      "https://unsplash.com/@zoejanestudios",
      "https://unsplash.com/@ninjason",
      "https://unsplash.com/@claybanks",
      "https://unsplash.com/@enginakyurt",
      "https://unsplash.com/@brett_jordan",
      "https://unsplash.com/@tingeyinjurylawfirm",
    ]);
  });

  it("fails rather than publishing a broken imported photograph", () => {
    expect(() =>
      presentGame({ ...copy, photo: { ...copy.photo, file: "missing.jpg" } }),
    ).toThrow('photograph "missing.jpg" is missing');
  });
});

describe("static game schema", () => {
  it.each([
    ["a missing question", { ...copy, questions: copy.questions.slice(1) }],
    [
      "an extra question",
      { ...copy, questions: [...copy.questions, firstQuestion] },
    ],
    [
      "a missing choice",
      { ...firstQuestion, choices: [firstQuestion.choices[0]] },
    ],
    ["an unknown answer key", { ...firstQuestion, answer: "neither" }],
    ["an empty explanation", { ...firstQuestion, explanation: [] }],
    ["duplicate choices", { ...firstQuestion, choices: ["same", "same"] }],
  ])("rejects %s", (_label, value) => {
    const page =
      "pageType" in value
        ? value
        : { ...copy, questions: [value, ...copy.questions.slice(1)] };
    expect(whoSaidWhatPageSchema.safeParse(page).success).toBe(false);
  });

  it("rejects duplicate question anchors", () => {
    expect(
      whoSaidWhatPageSchema.safeParse({
        ...copy,
        questions: copy.questions.map((question) => ({
          ...question,
          id: "same",
        })),
      }).success,
    ).toBe(false);
  });

  it("requires accessible, entry-owned photographs", () => {
    for (const photo of [
      { ...copy.photo, alt: "" },
      { ...copy.photo, file: "https://example.com/image.jpg" },
      { ...copy.photo, file: "../image.jpg" },
    ]) {
      expect(whoSaidWhatPageSchema.safeParse({ ...copy, photo }).success).toBe(
        false,
      );
    }
  });
});
