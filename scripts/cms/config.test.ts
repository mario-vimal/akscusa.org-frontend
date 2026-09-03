import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import {
  conferenceFormats,
  generalBodyPaperKinds,
  interventionKinds,
  interventionStatuses,
  programKinds,
  programStatuses,
  type TaxonomyTerm,
} from "../../app/features/editorial/taxonomy";
import { CMS_REPO_PLACEHOLDER } from "./repo";

interface CmsField {
  name: string;
  widget?: string;
  collection?: string;
  value_field?: string;
  options?: Array<{ label: string; value: string }>;
  fields?: CmsField[];
  field?: CmsField;
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
    create?: boolean;
    identifier_field?: string;
    slug?: string;
    summary?: string;
    thumbnail?: string;
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
    "programs",
  ];

  // Topics and categories are content an editor maintains, so a fixed option
  // list here would be exactly the thing that was removed: a new subject would
  // again need a developer. A relation is also what makes the reference safe,
  // because an editor can only pick a term that exists.
  const relationField = (collectionName: string, fieldName: string) => {
    const field = collection(collectionName).fields?.find(
      (entry) => entry.name === fieldName,
    );

    expect(
      field,
      `field "${fieldName}" is missing from "${collectionName}"`,
    ).toBeDefined();
    return field!;
  };

  const taxonomyCollections = [...editorialCollections, "books", "comics"];

  it.each(taxonomyCollections)(
    "picks topics from the collection in %s",
    (name) => {
      const topics = relationField(name, "topics");

      expect(topics.widget).toBe("relation");
      expect(topics.collection).toBe("topics");
      expect(topics.value_field).toBe("{{slug}}");
    },
  );

  it("picks an article's category from the collection", () => {
    const category = relationField("articles", "category");

    expect(category.widget).toBe("relation");
    expect(category.collection).toBe("categories");
    expect(category.value_field).toBe("{{slug}}");
  });

  it("lets an editor add a term to either vocabulary", () => {
    for (const name of ["topics", "categories"]) {
      const vocabulary = collection(name);

      expect(vocabulary.folder).toBe(`cms/content/${name}`);
      expect(vocabulary.create).toBe(true);
      expect(
        vocabulary.fields?.find((field) => field.name === "label"),
      ).toBeDefined();
    }
  });

  // `{{slug}}` slugifies the collection's identifier field, which Sveltia
  // defaults to `title` with no fallback. A collection that names its entries
  // something else and does not say so gets a random UUID filename instead of
  // a readable one, which is then the entry's permanent web address.
  it("names the identifier field of every collection whose slug is derived from one", () => {
    for (const entry of config.collections) {
      if (!entry.slug?.includes("{{slug}}")) {
        continue;
      }

      const identifier = entry.identifier_field ?? "title";

      expect(
        entry.fields?.map((field) => field.name),
        `collection "${entry.name}" derives its slug from "${identifier}"`,
      ).toContain(identifier);
    }
  });

  // `{{year}}`, `{{month}}` and `{{day}}` are the moment the entry is created,
  // not any date it carries: Sveltia only derives them from a field for a
  // preview path, and a slug template falls back to the current time. An entry
  // recorded after the event it describes — a reading written up later, a
  // meeting minuted the following year — would be filed under the day it was
  // typed, and a filename is the permanent web address. Read the entry's own
  // date field instead, as `{{date | date('YYYY')}}`.
  it("never dates a slug or summary by when the entry was typed", () => {
    const creationDateTag = /{{(year|month|day|hour|minute|second)}}/;

    for (const entry of config.collections) {
      expect(
        entry.slug ?? "",
        `collection "${entry.name}" dates its slug by entry creation`,
      ).not.toMatch(creationDateTag);
      expect(
        entry.summary ?? "",
        `collection "${entry.name}" dates its summary by entry creation`,
      ).not.toMatch(creationDateTag);
    }
  });

  // Sveltia picks a list thumbnail from top-level `image` and `file` fields
  // only, and it never descends into an object or a list. Every picture here
  // except a book's cover hangs off one, so it can carry its own alt text and
  // credit — which means a collection full of artwork shows a wall of blank
  // cards unless it names the path itself.
  it("shows a thumbnail wherever a collection holds artwork", () => {
    const imagePaths = (fields: CmsField[] = [], prefix = ""): string[] =>
      fields.flatMap((field) => {
        const path = prefix ? `${prefix}.${field.name}` : field.name;
        const nested = field.widget === "list" ? `${path}.*` : path;
        const inner = [
          ...(field.fields ?? []),
          ...(field.field ? [field.field] : []),
        ];

        return [
          ...(field.widget === "image" ? [path] : []),
          ...imagePaths(inner, nested),
        ];
      });

    for (const entry of config.collections) {
      const paths = imagePaths(entry.fields);

      if (paths.length === 0) {
        continue;
      }

      const automatic = entry.fields?.some((field) => field.widget === "image");

      if (automatic) {
        continue;
      }

      expect(
        paths,
        `collection "${entry.name}" buries its images and names no thumbnail`,
      ).toContain(entry.thumbnail);
    }
  });

  it("offers every intervention kind and status", () => {
    expectMatches("interventions", "kind", interventionKinds);
    expectMatches("interventions", "status", interventionStatuses);
  });

  it("offers every conference format", () => {
    expectMatches("conferences", "format", conferenceFormats);
  });

  it("keeps speaker biographies on conferences", () => {
    const conferenceSpeakers = collection("conferences").fields?.find(
      (field) => field.name === "speakers",
    );
    const interventionSpeakers = collection("interventions").fields?.find(
      (field) => field.name === "speakers",
    );

    expect(conferenceSpeakers?.widget).toBe("relation");
    expect(interventionSpeakers).toBeUndefined();
    expect(collection("speakers").folder).toBe("cms/content/speakers");
  });

  // A name typed into a book would be stored as an author slug and fail the
  // build, so the field has to be a relation rather than a list of strings.
  // This is also what makes one author's page gather every book of theirs.
  it("names a book's authors by picking from the authors collection", () => {
    const bookAuthors = collection("books").fields?.find(
      (field) => field.name === "authors",
    );

    expect(bookAuthors?.widget).toBe("relation");
    expect(collection("authors").folder).toBe("cms/content/authors");
  });

  it("offers every program kind and status", () => {
    expectMatches("programs", "kind", programKinds);
    expectMatches("programs", "status", programStatuses);
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
