import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function violations(source: string, filePath: string) {
  const results = await eslint.lintText(source, { filePath });
  return results.flatMap((result) =>
    result.messages.map((message) => message.ruleId),
  );
}

describe("application architecture boundaries", () => {
  it("rejects parent imports but keeps sibling and alias imports", async () => {
    const parent = await violations(
      'import { value } from "../other"; export { value };',
      "app/features/example/helper.ts",
    );
    expect(parent).toContain("no-restricted-imports");

    for (const path of ["./other", "~/lib/dates"]) {
      expect(
        await violations(
          `import { value } from "${path}"; export { value };`,
          "app/features/example/helper.ts",
        ),
      ).not.toContain("no-restricted-imports");
    }
  });

  it("keeps content readers in queries and the shared collection loader", async () => {
    const source =
      'import { getEntry } from "astro:content"; export const load = () => getEntry("pages", "home");';

    for (const path of [
      "app/features/example/presenters.ts",
      "app/lib/example.ts",
    ]) {
      expect(await violations(source, path)).toContain("no-restricted-imports");
    }

    for (const path of [
      "app/features/example/queries/entries.ts",
      "app/lib/collections.ts",
    ]) {
      expect(await violations(source, path)).not.toContain(
        "no-restricted-imports",
      );
    }
  });

  it("enforces content-reader boundaries in Astro frontmatter too", async () => {
    expect(
      await violations(
        '---\nimport { getEntry } from "astro:content";\nconst page = await getEntry("pages", "home");\n---\n<h1>{page?.id}</h1>',
        "app/pages/example.astro",
      ),
    ).toContain("no-restricted-imports");
  });

  it("allows content types and rendering outside query modules", async () => {
    expect(
      await violations(
        'import type { CollectionEntry } from "astro:content"; export type Page = CollectionEntry<"pages">;',
        "app/features/example/presenters.ts",
      ),
    ).not.toContain("no-restricted-imports");

    expect(
      await violations(
        'import { render } from "astro:content"; export { render };',
        "app/features/example/presenters.ts",
      ),
    ).not.toContain("no-restricted-imports");
  });

  it("rejects casting through unknown", async () => {
    expect(
      await violations(
        "export const unsafe = (value: string) => value as unknown as { id: string };",
        "app/features/example/helper.ts",
      ),
    ).toContain("no-restricted-syntax");
  });
});
