import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflow: unknown = parse(
  readFileSync(
    new URL("../../.github/workflows/validate.yml", import.meta.url),
    "utf8",
  ),
);

describe("release validation workflow", () => {
  it("validates production-branch pushes and reviewable pull requests", () => {
    expect(workflow).toMatchObject({
      on: {
        push: { branches: ["main"] },
        pull_request: {
          types: ["opened", "synchronize", "reopened", "ready_for_review"],
        },
      },
      jobs: {
        validate: {
          if: "github.event_name != 'pull_request' || github.event.pull_request.draft == false",
        },
      },
    });
  });

  it("runs the complete gate with browser dependencies but no write permissions", () => {
    expect(workflow).toMatchObject({
      permissions: { contents: "read" },
      jobs: {
        validate: {
          steps: expect.arrayContaining([
            expect.objectContaining({
              run: "npx playwright install --with-deps chromium firefox",
            }),
            expect.objectContaining({ run: "npm run validate" }),
          ]),
        },
      },
    });
  });
});
