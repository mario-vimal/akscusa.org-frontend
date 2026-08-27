import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import {
  articleCategories,
  conferenceFormats,
  editorialTopics,
  generalBodyPaperKinds,
  interventionKinds,
  interventionStatuses,
  type TaxonomyTerm,
} from "../../app/features/editorial/taxonomy";
import { CMS_REPO_PLACEHOLDER } from "./repo";

interface CmsField {
  name: string;
  widget?: string;
  options?: Array<{ label: string; value: string }>;
  fields?: CmsField[];
}

interface CmsConfig {
  backend: {
    name: string;
    repo: string;
    branch: string;
    squash_merges?: unknown;
  };
  publish_mode?: unknown;
  media_folder?: unknown;
  public_folder?: unknown;
  collections: Array<{
    name: string;
    folder?: string;
    files?: Array<{ file: string }>;
    fields?: CmsField[];
  }>;
}

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const configPath = new URL(
  "../../cms/public/admin/config.yml",
  import.meta.url,
);
const configSource = readFileSync(configPath, "utf8");
const config = parse(configSource) as CmsConfig;

describe("Sveltia CMS configuration", () => {
  // A committed repository would let a local dev server commit to the live site
  // as soon as someone signs in. Deployments name their repository via CMS_REPO.
  it("never commits a real backend repository", () => {
    expect(config.backend.name).toBe("github");
    expect(config.backend.branch).toBe("main");
    expect(config.backend.repo).toBe(CMS_REPO_PLACEHOLDER);
  });

  // Without this the CMS commits straight to the configured branch, so an
  // editor's save would land on `main` with no review.
  it("routes every change through a pull request", () => {
    expect(config.publish_mode).toBe("editorial_workflow");
  });

  // Sveltia rejects a configuration without a media folder unless a cloud media
  // library is enabled, and the published JSON schema does not cover the rule.
  it("defines a media folder that resolves to a served path", () => {
    expect(typeof config.media_folder).toBe("string");
    expect(config.media_folder).toBe("/cms/public/media");

    expect(config.public_folder).toBe("/media");
    expect(config.public_folder).not.toMatch(/^\.{1,2}\//);
    expect(config.public_folder).not.toMatch(/^https?:/);
  });

  // The CMS is for repeating, structured records. Static page copy lives in
  // `app/content/pages/` and is edited in Git, so it must stay out of the CMS.
  it("manages only structured records under cms/content/", () => {
    expect(config.collections).not.toHaveLength(0);

    for (const collection of config.collections) {
      expect(collection.folder).toBeDefined();
      expect(collection.files).toBeUndefined();

      const folder = collection.folder as string;

      expect(folder.startsWith("cms/content/")).toBe(true);
      expect(existsSync(`${projectRoot}/${folder}`)).toBe(true);
    }
  });

  it("never points the CMS at the application folder", () => {
    const settings = configSource
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");

    expect(settings).not.toMatch(/\bapp\//);
  });

  it("pins the browser bundle and never commits a media library secret", () => {
    const adminHtml = readFileSync(
      new URL("../../cms/public/admin/index.html", import.meta.url),
      "utf8",
    );

    expect(adminHtml).toContain(
      "https://unpkg.com/@sveltia/cms@0.201.1/dist/sveltia-cms.js",
    );
    expect(configSource).not.toMatch(/^\s*secret_access_key:/m);
  });
});

// The CMS cannot import TypeScript, so its option lists are written out in
// YAML. An option the Zod schemas reject would let an editor save an entry that
// then fails the build, so the two are compared here instead.
describe("Sveltia CMS taxonomy options", () => {
  const collection = (name: string) => {
    const found = config.collections.find((entry) => entry.name === name);
    expect(found, `collection "${name}" is missing`).toBeDefined();
    return found!;
  };

  const selectOptions = (collectionName: string, fieldName: string) => {
    const field = collection(collectionName).fields?.find(
      (entry) => entry.name === fieldName,
    );
    expect(
      field,
      `field "${fieldName}" is missing from "${collectionName}"`,
    ).toBeDefined();
    expect(field!.widget).toBe("select");
    return field!.options ?? [];
  };

  const expectMatches = (
    collectionName: string,
    fieldName: string,
    terms: readonly TaxonomyTerm[],
  ) => {
    expect(selectOptions(collectionName, fieldName)).toEqual(
      terms.map((term) => ({ label: term.label, value: term.id })),
    );
  };

  const editorialCollections = [
    "articles",
    "press-releases",
    "interventions",
    "conferences",
  ];

  it.each(editorialCollections)("offers every topic in %s", (name) => {
    expectMatches(name, "topics", editorialTopics);
  });

  it("offers every article category", () => {
    expectMatches("articles", "category", articleCategories);
  });

  it("offers every intervention kind and status", () => {
    expectMatches("interventions", "kind", interventionKinds);
    expectMatches("interventions", "status", interventionStatuses);
  });

  it("offers every conference format", () => {
    expectMatches("conferences", "format", conferenceFormats);
  });

  // `kind` sits inside the `papers` list rather than at the top level, so the
  // nested field is looked up directly instead of through `selectOptions`.
  it("offers every General Body paper kind", () => {
    const papers = collection("general-body-meetings").fields?.find(
      (field) => field.name === "papers",
    );
    const kind = papers?.fields?.find((field) => field.name === "kind");

    expect(kind?.widget).toBe("select");
    expect(kind?.options ?? []).toEqual(
      generalBodyPaperKinds.map((term) => ({
        label: term.label,
        value: term.id,
      })),
    );
  });

  // A summary is what the index cards and the meta description are built from,
  // so an entry saved without one would publish an empty card.
  it.each(editorialCollections)("requires a summary in %s", (name) => {
    const summary = collection(name).fields?.find(
      (field) => field.name === "summary",
    );

    expect(summary).toBeDefined();
    expect(summary).not.toHaveProperty("required", false);
  });
});
