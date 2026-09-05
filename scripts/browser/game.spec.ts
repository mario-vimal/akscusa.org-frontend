import { expect, test, visit } from "./fixtures";

test("the recovered game checks answers, invalidates changes, and resets", async ({
  page,
}) => {
  await visit(page, "/who-said-what/");
  const questions = page.locator("[data-game-question]");
  await expect(questions).toHaveCount(5);
  await page.locator("[data-check-all]").click();
  await expect(
    questions.first().locator("[data-game-choice]").first(),
  ).toBeFocused();
  await expect(page.locator("[data-game-progress]")).toContainText("0 of 5");

  for (const question of await questions.all()) {
    const answer = await question.getAttribute("data-answer");
    if (answer !== "first" && answer !== "second" && answer !== "both") {
      throw new Error("The game has no valid answer key.");
    }
    for (const value of answer === "both" ? ["first", "second"] : [answer]) {
      await question.locator(`[data-game-choice][value="${value}"]`).check();
    }
  }
  await page.locator("[data-check-all]").click();
  await expect(page.locator("[data-game-progress]")).toHaveText(
    "5 of 5 questions checked. 5 correct.",
  );
  await expect(page.locator("[data-answer-details][open]")).toHaveCount(5);

  const first = questions.first();
  const key = await first.getAttribute("data-answer");
  if (key === "both") {
    await first.locator('[data-game-choice][value="second"]').uncheck();
  } else {
    await first
      .locator(
        `[data-game-choice][value="${key === "first" ? "second" : "first"}"]`,
      )
      .check();
  }
  await expect(first.locator("[data-answer-feedback]")).toContainText(
    "Answer changed",
  );
  await expect(page.locator("[data-game-progress]")).toContainText("4 of 5");

  await page.locator("[data-game-reset]").click();
  await expect(page.locator("[data-game-choice]:checked")).toHaveCount(0);
  await expect(page.locator("[data-answer-details][open]")).toHaveCount(0);
  await expect(first.locator("[data-game-choice]").first()).toBeFocused();
});

test.describe("game without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("all explanations remain readable without inactive scoring controls", async ({
    page,
  }) => {
    await page.goto("/who-said-what/", { waitUntil: "load" });
    await expect(page.locator("[data-game-question]")).toHaveCount(5);
    await expect(page.locator("[data-question-actions]:visible")).toHaveCount(
      0,
    );
    await expect(page.locator("[data-game-actions]")).toBeHidden();
    const answer = page.locator("[data-answer-details]").first();
    await answer.locator("summary").click();
    await expect(answer).toHaveAttribute("open", "");
  });
});
