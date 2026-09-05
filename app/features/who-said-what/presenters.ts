import type { ImageMetadata } from "astro";

import { formatMonth } from "~/lib/dates";
import type { WhoSaidWhatPageCopy } from "~/schemas/pages";

const photographs = import.meta.glob<{ default: ImageMetadata }>(
  "~/content/pages/who-said-what/assets/*.jpg",
  { eager: true },
);

function presentPhoto(photo: WhoSaidWhatPageCopy["photo"]) {
  const image = Object.entries(photographs).find(([path]) =>
    path.endsWith(`/${photo.file}`),
  )?.[1];
  if (!image) {
    throw new Error(`Who said What?! photograph "${photo.file}" is missing.`);
  }

  return { ...photo, src: image.default };
}

function presentQuestion(
  question: WhoSaidWhatPageCopy["questions"][number],
  index: number,
) {
  const multiple = question.answer === "both";
  return {
    ...question,
    number: index + 1,
    label: `Question ${index + 1}`,
    inputType: multiple ? ("checkbox" as const) : ("radio" as const),
    hint: multiple ? "Select all that apply." : "Choose one answer.",
    answerLabel: multiple
      ? "Answer: Both choices."
      : `Answer: The ${question.answer} choice.`,
    choices: [
      { value: "first", letter: "A", text: question.choices[0] },
      { value: "second", letter: "B", text: question.choices[1] },
    ],
    photo: presentPhoto(question.photo),
  };
}

export function presentGame(copy: WhoSaidWhatPageCopy) {
  return {
    ...copy,
    dateLabel: formatMonth(copy.publishedAt),
    photo: presentPhoto(copy.photo),
    questions: copy.questions.map(presentQuestion),
  };
}

export type GamePhotoView = ReturnType<typeof presentPhoto>;
export type GameQuestionView = ReturnType<typeof presentQuestion>;
export type GameView = ReturnType<typeof presentGame>;
