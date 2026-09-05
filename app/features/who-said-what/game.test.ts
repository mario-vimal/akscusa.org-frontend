import { describe, expect, it } from "vitest";

import {
  answerChoices,
  answerFeedback,
  checkAnswer,
  gameProgress,
  parseAnswerKey,
} from "./game";

describe("the historical answer key", () => {
  it.each(["first", "second", "both"] as const)(
    "recognizes the %s key",
    (answer) => {
      expect(parseAnswerKey(answer)).toBe(answer);
      expect(checkAnswer(answer, answerChoices(answer))).toBe("correct");
      expect(checkAnswer(answer, [])).toBe("unanswered");
    },
  );

  it.each([undefined, "", "all", "FIRST", "third"])(
    "does not guess an invalid key %s",
    (value) => {
      expect(parseAnswerKey(value)).toBeUndefined();
    },
  );

  it("requires both choices for a multiple-answer question", () => {
    expect(checkAnswer("both", ["first"])).toBe("incorrect");
    expect(checkAnswer("both", ["second"])).toBe("incorrect");
    expect(checkAnswer("both", ["second", "first"])).toBe("correct");
  });

  it("does not accept the second choice or both choices for question three", () => {
    expect(checkAnswer("first", ["second"])).toBe("incorrect");
    expect(checkAnswer("first", ["first", "second"])).toBe("incorrect");
  });

  it("compares selections as a set without accepting unknown choices", () => {
    expect(checkAnswer("both", ["first", "second", "first"])).toBe("correct");
    expect(checkAnswer("both", ["first", "second", "third"])).toBe("incorrect");
    expect(checkAnswer("first", ["third"])).toBe("incorrect");
  });
});

describe("answer feedback", () => {
  it("distinguishes an unanswered question from a wrong answer", () => {
    expect(answerFeedback("unanswered")).toBe(
      "Choose an answer before checking.",
    );
    expect(answerFeedback("incorrect")).toMatch(/^Not quite\./);
    expect(answerFeedback("correct")).toMatch(/^Correct\./);
  });

  it("points checked answers to the explanation rather than relying on color", () => {
    for (const result of ["correct", "incorrect"] as const) {
      expect(answerFeedback(result)).toContain(
        "The answer and explanation are open below.",
      );
    }
  });
});

describe("game progress", () => {
  it("does not count skipped or changed answers as checked", () => {
    expect(
      gameProgress([
        "correct",
        "incorrect",
        "unanswered",
        undefined,
        undefined,
      ]),
    ).toBe("2 of 5 questions checked. 1 correct.");
  });

  it("reports a finished game from its checked answers", () => {
    expect(
      gameProgress(["correct", "correct", "correct", "correct", "correct"]),
    ).toBe("5 of 5 questions checked. 5 correct.");
  });

  it("clears the score when every answer is reset", () => {
    expect(
      gameProgress([undefined, undefined, undefined, undefined, undefined]),
    ).toBe("0 of 5 questions checked. 0 correct.");
  });
});
