import {
  answerFeedback,
  checkAnswer,
  gameProgress,
  parseAnswerKey,
  type AnswerKey,
  type AnswerResult,
} from "./game";

interface QuestionControls {
  answer: AnswerKey;
  inputs: HTMLInputElement[];
  feedback: HTMLElement;
  details: HTMLDetailsElement;
  actions: HTMLElement;
  check: HTMLButtonElement;
  result?: AnswerResult;
}

function readQuestion(element: HTMLElement): QuestionControls | undefined {
  const answer = parseAnswerKey(element.dataset.answer);
  const inputs = Array.from(
    element.querySelectorAll<HTMLInputElement>("[data-game-choice]"),
  );
  const feedback = element.querySelector<HTMLElement>("[data-answer-feedback]");
  const details = element.querySelector<HTMLDetailsElement>(
    "[data-answer-details]",
  );
  const actions = element.querySelector<HTMLElement>("[data-question-actions]");
  const check = element.querySelector<HTMLButtonElement>("[data-check-answer]");

  if (
    !answer ||
    inputs.length !== 2 ||
    !feedback ||
    !details ||
    !actions ||
    !check
  ) {
    return undefined;
  }
  return { answer, inputs, feedback, details, actions, check };
}

function checkQuestion(question: QuestionControls): AnswerResult {
  const result = checkAnswer(
    question.answer,
    question.inputs
      .filter((input) => input.checked)
      .map((input) => input.value),
  );
  question.result = result;
  question.feedback.textContent = answerFeedback(result);
  if (result !== "unanswered") question.details.open = true;
  return result;
}

export function mountGame(): void {
  const root = document.querySelector<HTMLElement>("[data-who-said-what]");
  if (!root || root.dataset.gameReady) return;

  const elements = Array.from(
    root.querySelectorAll<HTMLElement>("[data-game-question]"),
  );
  const questions = elements
    .map(readQuestion)
    .filter((question) => question !== undefined);
  const actions = root.querySelector<HTMLElement>("[data-game-actions]");
  const progress = root.querySelector<HTMLElement>("[data-game-progress]");
  const checkAll = root.querySelector<HTMLButtonElement>("[data-check-all]");
  const reset = root.querySelector<HTMLButtonElement>("[data-game-reset]");

  // Keep the native answer disclosures usable if the enhancement cannot mount.
  if (
    questions.length !== elements.length ||
    !questions.length ||
    !actions ||
    !progress ||
    !checkAll ||
    !reset
  ) {
    return;
  }

  const updateProgress = () => {
    progress.textContent = gameProgress(
      questions.map((question) => question.result),
    );
  };

  for (const question of questions) {
    question.check.addEventListener("click", () => {
      if (checkQuestion(question) === "unanswered") question.inputs[0]?.focus();
      updateProgress();
    });
    for (const input of question.inputs) {
      input.addEventListener("change", () => {
        if (question.result !== undefined) {
          question.feedback.textContent =
            "Answer changed. Check it again when you’re ready.";
          question.result = undefined;
          updateProgress();
        }
      });
    }
    question.actions.hidden = false;
  }

  checkAll.addEventListener("click", () => {
    for (const question of questions) checkQuestion(question);
    updateProgress();
    questions
      .find((question) => question.result === "unanswered")
      ?.inputs[0]?.focus();
  });

  reset.addEventListener("click", () => {
    for (const question of questions) {
      for (const input of question.inputs) input.checked = false;
      question.result = undefined;
      question.feedback.textContent = "";
      question.details.open = false;
    }
    progress.textContent = `Answers cleared. ${gameProgress(questions.map((question) => question.result))}`;
    questions[0]?.inputs[0]?.focus();
  });

  updateProgress();
  actions.hidden = false;
  root.dataset.gameReady = "true";
}
