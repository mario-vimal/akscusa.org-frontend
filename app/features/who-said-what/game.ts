export type Choice = "first" | "second";
export type AnswerKey = Choice | "both";
export type AnswerResult = "unanswered" | "correct" | "incorrect";

export function parseAnswerKey(
  value: string | undefined,
): AnswerKey | undefined {
  return value === "first" || value === "second" || value === "both"
    ? value
    : undefined;
}

export function answerChoices(answer: AnswerKey): readonly Choice[] {
  return answer === "both" ? ["first", "second"] : [answer];
}

export function checkAnswer(
  answer: AnswerKey,
  selected: readonly string[],
): AnswerResult {
  const choices = new Set(selected);
  if (choices.size === 0) return "unanswered";

  const expected = answerChoices(answer);
  return choices.size === expected.length &&
    expected.every((choice) => choices.has(choice))
    ? "correct"
    : "incorrect";
}

export function answerFeedback(result: AnswerResult): string {
  switch (result) {
    case "unanswered":
      return "Choose an answer before checking.";
    case "correct":
      return "Correct. The answer and explanation are open below.";
    case "incorrect":
      return "Not quite. The answer and explanation are open below.";
  }
}

export function gameProgress(
  results: readonly (AnswerResult | undefined)[],
): string {
  const checked = results.filter(
    (result) => result === "correct" || result === "incorrect",
  ).length;
  const correct = results.filter((result) => result === "correct").length;
  const noun = results.length === 1 ? "question" : "questions";
  return `${checked} of ${results.length} ${noun} checked. ${correct} correct.`;
}
