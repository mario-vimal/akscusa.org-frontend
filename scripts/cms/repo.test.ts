import { describe, expect, it } from "vitest";

import {
  applyCmsRepo,
  CMS_REPO_PLACEHOLDER,
  cmsRepoOverride,
  cmsRepoSetupHint,
} from "./repo";

describe("cmsRepoOverride", () => {
  it("returns nothing when CMS_REPO is unset or blank", () => {
    expect(cmsRepoOverride({})).toBeUndefined();
    expect(cmsRepoOverride({ CMS_REPO: "   " })).toBeUndefined();
  });

  it("returns the requested repository", () => {
    expect(
      cmsRepoOverride({ CMS_REPO: " akscsfba/akscusa.org-frontend " }),
    ).toBe("akscsfba/akscusa.org-frontend");
  });

  it("rejects a value that is not an owner/name path", () => {
    expect(() => cmsRepoOverride({ CMS_REPO: "akscusa.org-frontend" })).toThrow(
      /owner\/name/,
    );
  });
});

describe("cmsRepoSetupHint", () => {
  it("points Cloudflare builds at the build command", () => {
    const hint = cmsRepoSetupHint({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "sveltia",
    });

    expect(hint).toContain("CMS_REPO=owner/name npm run build");
    expect(hint).toContain("cached build");
  });

  it("points GitHub Actions builds at a repository variable", () => {
    const hint = cmsRepoSetupHint({ GITHUB_ACTIONS: "true" });

    expect(hint).toContain("gh variable set CMS_REPO");
    expect(hint).toContain("does not apply");
  });

  it("falls back to local guidance", () => {
    expect(cmsRepoSetupHint({})).toContain(".env");
  });
});

describe("applyCmsRepo", () => {
  const config = [
    "backend:",
    "  name: github",
    "  # Deliberately not a real repository.",
    `  repo: ${CMS_REPO_PLACEHOLDER}`,
    "  branch: main",
    "",
  ].join("\n");

  it("keeps the placeholder when no repository is resolved", () => {
    expect(applyCmsRepo(config, undefined)).toBe(config);
  });

  it("replaces the placeholder with the named repository", () => {
    expect(applyCmsRepo(config, "akscsfba/akscusa.org-frontend")).toContain(
      "  repo: akscsfba/akscusa.org-frontend\n",
    );
  });

  it("preserves surrounding configuration and indentation", () => {
    expect(applyCmsRepo(config, "a/b")).toBe(
      config.replace(CMS_REPO_PLACEHOLDER, "a/b"),
    );
  });

  it("leaves commented repository entries alone", () => {
    expect(applyCmsRepo(config, "a/b")).toContain(
      "  # Deliberately not a real repository.",
    );
  });

  it("fails loudly when the expected entry is missing or ambiguous", () => {
    expect(() => applyCmsRepo("backend:\n  name: github\n", "a/b")).toThrow(
      /found 0/,
    );
    expect(() => applyCmsRepo(`${config}${config}`, "a/b")).toThrow(/found 2/);
  });
});
