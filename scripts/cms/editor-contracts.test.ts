import { existsSync, globSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";

import {
  cmsEntryId,
  cmsSlug,
  editorialBase,
  editorialImageSchema,
  linkSchema,
  mediaFilePath,
  mediaImageExtensions,
  mediaImagePath,
  optionalCmsField,
  optionalIsbn13,
  posterListSchema,
  readingDate,
  resourceUrl,
  slugReferences,
  topicsSchema,
} from "~/schemas/shared";
import {
  collectionNamed,
  config,
  fieldNamed,
  nestedFields,
  projectRoot,
} from "./config";
import {
  imageUploads,
  namedEntries,
  pdfUpload,
  readingInputs,
  renamedAuthor,
  serializedMeeting,
  serializedProgram,
  uploadCollision,
} from "./editor-fixtures";

describe("Pacific reading authoring and calendar-only controls", () => {
  it("uses the pinned Pacific-input/UTC-output profile without dropping the offset in a format", () => {
    const field = fieldNamed("book-readings", "date");

    expect(field.widget).toBe("datetime");
    expect(field.input_timezone).toBe("America/Los_Angeles");
    expect(field.output_utc).toBe(true);
    expect(field.format).toBeUndefined();
    expect(field.type).not.toBe("date");
  });

  it.each(readingInputs)(
    "accepts the actual serialized Pacific input $input across DST seasons",
    ({ input, stored }) => {
      const data = z
        .object({ date: readingDate })
        .parse(parse(stringify({ date: stored })));

      expect(data.date.toISOString()).toBe(stored.replace("Z", ".000Z"));
      expect(readingDate.safeParse(`${input}:00`).success).toBe(false);
    },
  );

  it("makes every other calendar field date-only", () => {
    const calendars = config.collections.flatMap((collection) =>
      nestedFields(collection.fields)
        .filter(({ field }) => field.widget === "datetime")
        .filter(() => collection.name !== "book-readings"),
    );

    expect(calendars.length).toBeGreaterThan(0);
    for (const { field } of calendars) {
      expect(field.type).toBe("date");
      expect(field.format).toBe("YYYY-MM-DD");
    }

    const value = z
      .object({ date: editorialBase.date })
      .parse(parse(stringify({ date: "2026-09-19" })));
    expect(value.date.toISOString()).toBe("2026-09-19T00:00:00.000Z");
  });
});

describe("one filename, content ID and relation value", () => {
  it("uses the ASCII/transliteration profile that generated the pinned fixtures", () => {
    expect(config.slug).toEqual({
      encoding: "ascii",
      clean_accents: true,
      sanitize_replacement: "-",
      trim: true,
      lowercase: true,
    });
  });

  it.each(namedEntries)(
    "keeps the filename and every kind of relation identical for $input",
    ({ input, slug }) => {
      expect(cmsEntryId({ entry: `${slug}.md` })).toBe(slug);
      expect(cmsEntryId({ entry: `${slug}/index.md` })).toBe(slug);
      expect(cmsSlug.parse(slug)).toBe(slug);
      expect(topicsSchema.parse([slug])).toEqual([slug]);
      expect(
        slugReferences("author", "Duplicate author.").parse([slug]),
      ).toEqual([slug]);
      const data = z
        .object({ name: z.string() })
        .parse(parse(stringify({ name: input })));
      expect(data.name).toBe(input);
    },
  );

  it("does not move an existing author's address when their display name changes", () => {
    expect(renamedAuthor.storedSlug).toBe(renamedAuthor.originalSlug);
    expect(cmsEntryId({ entry: `${renamedAuthor.storedSlug}/index.md` })).toBe(
      renamedAuthor.originalSlug,
    );
    expect(fieldNamed("books", "authors").value_field).toBe("{{slug}}");
  });

  it("preserves IDs across entry bundles and flat vocabularies", () => {
    for (const collection of config.collections) {
      if (!collection.folder)
        throw new Error(`No folder for ${collection.name}`);
      const filenames = globSync("**/*.md", {
        cwd: join(projectRoot, collection.folder),
      });
      const ids = filenames.map((entry) => cmsEntryId({ entry }));
      expect(new Set(ids).size, collection.name).toBe(ids.length);
      for (const filename of filenames) {
        if (collection.path) {
          expect(collection.path).toBe("{{slug}}/index");
          expect(filename).toMatch(/^[a-z0-9_~-]+\/index\.md$/);
          expect(cmsEntryId({ entry: filename })).toBe(filename.split("/")[0]);
        } else {
          expect(["topics", "categories"]).toContain(collection.name);
          expect(filename).toMatch(/^[a-z0-9_~-]+\.md$/);
          expect(cmsEntryId({ entry: filename })).toBe(filename.slice(0, -3));
        }
      }
    }
  });

  it.each([
    "../another-entry.md",
    "Nested/name.md",
    "B. R. Ambedkar.md",
    "éclair.md",
  ])(
    "rejects manually introduced filenames outside the CMS contract: %s",
    (entry) => {
      expect(() => cmsEntryId({ entry })).toThrow();
    },
  );
});

describe("optional ISBN input", () => {
  const field = fieldNamed("books", "isbn");
  const pattern = new RegExp(field.pattern?.[0] ?? "(?!)");

  it.each([
    "",
    "   ",
    "9788185604695",
    "978-81-85604-69-5",
    " 978 81 85604 69 5 ",
    "979-1-23456-789-6",
  ])(
    "accepts normal prospective editor input %j in both widget and schema",
    (value) => {
      expect(field.required).toBe(false);
      expect(pattern.test(value.trim())).toBe(true);
      expect(optionalIsbn13.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    "818560469X",
    "4006381333931",
    "0000000000000",
    "978818560469",
    "ISBN: 9788185604695",
  ])("rejects unsupported nonempty input %s", (value) => {
    expect(pattern.test(value)).toBe(false);
    expect(optionalIsbn13.safeParse(value).success).toBe(false);
  });

  it("keeps checksum validation in the shared ISBN schema", () => {
    expect(pattern.test("9788185604696")).toBe(true);
    expect(optionalIsbn13.safeParse("9788185604696").success).toBe(false);
  });
});

const localImages = [
  { collection: "books", field: "cover", folder: "books" },
  { collection: "authors", field: "portrait.src", folder: "authors" },
  { collection: "programs", field: "posters.src", folder: "programs" },
  {
    collection: "book-readings",
    field: "posters.src",
    folder: "book-readings",
  },
  { collection: "comics", field: "panels.src", folder: "comics" },
  {
    collection: "toolkit-scenarios",
    field: "panels.src",
    folder: "toolkit-scenarios",
  },
] as const;

const providerSchema = z
  .object({
    definitions: z.object({
      CloudMediaLibraryName: z.object({ enum: z.array(z.string()) }),
    }),
  })
  .parse(
    JSON.parse(
      readFileSync(
        new URL("./sveltia-cms-0.201.1.schema.json", import.meta.url),
        "utf8",
      ),
    ),
  );
const remoteProviders = [
  ...providerSchema.definitions.CloudMediaLibraryName.enum,
  "stock_assets",
];

describe("local-only media controls", () => {
  it("normalizes filenames for standalone library uploads as well as fields", () => {
    expect(config.media_libraries?.all?.slugify_filename).toBe(true);
  });

  it("stores public URLs for every owned upload instead of entry-relative filenames", () => {
    for (const collection of config.collections) {
      if (collection.name === "topics" || collection.name === "categories") {
        expect(collection.path).toBeUndefined();
        continue;
      }
      expect(collection.path).toBe("{{slug}}/index");
      expect(collection.media_folder).toBe(
        `/cms/content/${collection.name}/{{slug}}`,
      );
      expect(collection.public_folder).toBe(
        `/media/${collection.name}/{{slug}}`,
      );
    }
  });

  it.each(localImages)(
    "aligns $collection ($field) formats, paths and providers with its schema",
    ({ collection, field: path, folder }) => {
      const field = fieldNamed(collection, path);
      expect(field.widget).toBe("image");
      expect(
        field.accept?.split(",").map((extension) => extension.slice(1)),
      ).toEqual(mediaImageExtensions);
      expect(field.choose_url).toBe(false);
      expect(collectionNamed(collection).path).toBe("{{slug}}/index");
      expect(collectionNamed(collection).media_folder).toBe(
        `/cms/content/${folder}/{{slug}}`,
      );
      expect(collectionNamed(collection).public_folder).toBe(
        `/media/${folder}/{{slug}}`,
      );

      const repository = field.media_libraries?.default;
      if (!repository)
        throw new Error(
          `${collection}.${path} has no repository media library`,
        );
      expect(repository.config?.slugify_filename).toBe(true);
      for (const provider of remoteProviders) {
        expect(
          field.media_libraries?.[provider],
          `${collection}.${path}: ${provider}`,
        ).toBe(false);
      }

      const pattern = new RegExp(field.pattern?.[0] ?? "(?!)");
      expect(pattern.test("/media/archive/2018/07/preserved-image.jpg")).toBe(
        false,
      );
      for (const { filename } of imageUploads) {
        const publicPath = `/media/${folder}/new-entry/${filename}`;
        expect(pattern.test(filename)).toBe(true);
        expect(pattern.test(publicPath)).toBe(true);
        expect(mediaImagePath(folder).parse(publicPath)).toBe(publicPath);
      }
      expect(
        mediaImagePath(folder).safeParse(
          `https://example.com/${imageUploads[0].filename}`,
        ).success,
      ).toBe(false);
      for (const path of [
        `/media/${folder}/new-entry/animation.gif`,
        `/media/${folder}/new-entry/diagram.svg`,
        "https://example.com/image.jpg",
      ]) {
        expect(pattern.test(path)).toBe(false);
      }
      expect(
        mediaImagePath(folder).safeParse(
          `/media/${folder}/new-entry/animation.gif`,
        ).success,
      ).toBe(false);
    },
  );

  it("keeps PDF documents local and PDF-only", () => {
    const field = fieldNamed("general-body-meetings", "papers.file");
    expect(field.widget).toBe("file");
    expect(field.accept).toBe(".pdf");
    expect(field.choose_url).toBe(false);
    for (const provider of remoteProviders) {
      expect(field.media_libraries?.[provider]).toBe(false);
    }
    const schema = mediaFilePath("general-body-meetings", ["pdf"]);
    const publicPath = `/media/general-body-meetings/new-meeting/${pdfUpload.filename}`;
    const pattern = new RegExp(field.pattern?.[0] ?? "(?!)");
    expect(pattern.test(pdfUpload.filename)).toBe(true);
    expect(pattern.test(publicPath)).toBe(true);
    expect(
      pattern.test("/media/general-body-meetings/new-meeting/scan.jpg"),
    ).toBe(false);
    expect(pattern.test("https://example.com/report.pdf")).toBe(false);
    expect(pattern.test("/media/archive/2023/08/statement.pdf")).toBe(false);
    expect(
      schema.safeParse("/media/archive/2023/08/statement.pdf").success,
    ).toBe(false);
    expect(schema.parse(publicPath)).toBe(publicPath);
    expect(
      schema.safeParse("/media/general-body-meetings/new-meeting/cover-art.jpg")
        .success,
    ).toBe(false);
  });

  it("does not reject an unset optional cover when applying its media pattern", () => {
    const field = fieldNamed("books", "cover");
    const pattern = new RegExp(field.pattern?.[0] ?? "(?!)");
    const schema = optionalCmsField(mediaImagePath("books"));

    expect(field.required).toBe(false);
    // Sveltia's scalar validator tests String(value), including unset values.
    // A file picker with choose_url:false cannot author literal null/undefined
    // text; these alternatives represent internal empty states, not paths.
    for (const value of ["", null, undefined]) {
      expect(pattern.test(String(value))).toBe(true);
      expect(schema.parse(value)).toBeUndefined();
    }
  });

  it("accepts the CMS's collision-safe filename without overwriting a shared upload", () => {
    expect(uploadCollision.filename).not.toBe(uploadCollision.existing);
    expect(
      mediaImagePath("books").parse(
        `/media/books/new-book/${uploadCollision.filename}`,
      ),
    ).toBe("/media/books/new-book/cover-art-1.jpg");
  });

  it("permits shared local-library selections without admitting remote or unsafe paths", () => {
    const images = mediaImagePath("books");
    for (const src of [
      "/media/shared/shared-cover.jpg",
      "/media/authors/new-author/photo-ete.png",
      "/media/shared/announcements/reused-flyer.webp",
    ]) {
      expect(images.parse(src)).toBe(src);
    }
    for (const src of [
      "/media/../cover.jpg",
      "/media/books/../../cover.jpg",
      "/media//cover.jpg",
      "/media/books/new-book/IMG_1234.JPG",
      "/media/books/new-book/cover.svg",
      "/media/books/cover.jpg",
      "https://example.com/cover.jpg",
    ]) {
      expect(images.safeParse(src).success).toBe(false);
    }
    expect(
      mediaFilePath("general-body-meetings", ["pdf"]).parse(
        "/media/shared/shared-report.pdf",
      ),
    ).toBe("/media/shared/shared-report.pdf");
  });
});

describe("static editorial images with optional genuine external URLs", () => {
  const fields = [
    ...[
      "articles",
      "press-releases",
      "interventions",
      "conferences",
      "book-readings",
    ].map((collection) => ({ collection, path: "heroImage.src" })),
    { collection: "speakers", path: "portrait.src" },
  ];

  it.each(fields)(
    "uploads locally in $collection ($path) while preserving third-party image URLs",
    ({ collection, path }) => {
      const field = fieldNamed(collection, path);
      expect(field.widget).toBe("image");
      expect(
        field.accept?.split(",").map((extension) => extension.slice(1)),
      ).toEqual(mediaImageExtensions);
      expect(field.choose_url).toBe(true);
      const library = field.media_libraries?.default;
      if (!library)
        throw new Error(`No repository picker for ${collection}.${path}`);
      expect(library.config?.slugify_filename).toBe(true);
      expect(collectionNamed(collection).path).toBe("{{slug}}/index");
      expect(collectionNamed(collection).media_folder).toBe(
        `/cms/content/${collection}/{{slug}}`,
      );
      expect(collectionNamed(collection).public_folder).toBe(
        `/media/${collection}/{{slug}}`,
      );
      for (const provider of remoteProviders) {
        expect(field.media_libraries?.[provider]).toBe(false);
      }
      const pattern = new RegExp(field.pattern?.[0] ?? "(?!)");
      expect(pattern.test("img_1234.jpg")).toBe(true);
      for (const src of [
        `/media/${collection}/new-entry/image.webp`,
        "/media/shared/image.png",
        "https://example.com/image.webp",
        "http://example.com/image?size=large",
      ]) {
        expect(pattern.test(src)).toBe(true);
        expect(
          editorialImageSchema.parse({ src, alt: "Event gathering" }).src,
        ).toBe(src);
      }
      for (const src of [
        "/media/books/image.jpg",
        "/media/shared/animation.gif",
        "data:image/png;base64,AAAA",
        "ftp://example.com/image.jpg",
      ]) {
        expect(pattern.test(src)).toBe(false);
        expect(
          editorialImageSchema.safeParse({ src, alt: "Event gathering" })
            .success,
        ).toBe(false);
      }
    },
  );

  it("explicitly disables every cloud/stock provider and keeps the shared static library", () => {
    for (const provider of remoteProviders) {
      expect(config.media_libraries?.[provider]).toBe(false);
    }
    expect(config.media_folder).toBe("/cms/public/media/shared");
    expect(config.public_folder).toBe("/media/shared");
  });
});

describe("resource and attachment controls", () => {
  const fields = [
    ["press-releases", "attachments.url"],
    ["interventions", "resources.url"],
    ["conferences", "resources.url"],
    ["programs", "resources.url"],
    ["books", "resources.url"],
    ["book-readings", "resources.url"],
  ] as const;

  it.each(fields)(
    "accepts uploaded documents and links in %s %s",
    (collection, path) => {
      const field = fieldNamed(collection, path);
      const pattern = new RegExp(field.pattern?.[0] ?? "(?!)");
      expect(field.widget).toBe("file");
      expect(field.choose_url).toBe(true);
      expect(field.accept).toBe(".pdf,.png,.jpg,.jpeg,.webp");
      expect(field.media_libraries?.default).toBeTruthy();
      for (const provider of remoteProviders) {
        expect(field.media_libraries?.[provider]).toBe(false);
      }
      expect(pattern.test("new-document.pdf")).toBe(true);
      for (const url of [
        `/media/${collection}/new-entry/document.pdf`,
        "/media/shared/document.pdf#page=2",
        "/who-said-what/",
        "#references",
        "https://example.com/document.pdf",
        "http://example.com/publication",
      ]) {
        expect(pattern.test(url)).toBe(true);
        expect(resourceUrl.parse(url)).toBe(url);
        expect(linkSchema.parse({ label: "Reference", url }).url).toBe(url);
      }
      expect(pattern.test("/media/shared/unsupported.svg")).toBe(false);
      expect(pattern.test("javascript:alert(1)")).toBe(false);
    },
  );
});

describe("real CMS YAML output", () => {
  it("retains the paper in the pinned serializer's unquoted output", () => {
    const meeting = z
      .object({
        edition: z.number(),
        papers: z.array(
          z.object({ file: mediaFilePath("general-body-meetings", ["pdf"]) }),
        ),
      })
      .parse(parse(serializedMeeting));

    expect(meeting.papers).toHaveLength(1);
    expect(meeting.edition).toBe(12);
    expect(stringify(meeting).trim()).toBe(serializedMeeting);
  });

  it("retains both posters in the pinned serializer's unquoted output", () => {
    const program = z
      .object({ posters: posterListSchema("programs") })
      .parse(parse(serializedProgram));
    expect(program.posters).toHaveLength(2);
    expect(stringify(program).trim()).toBe(serializedProgram);
  });
});

describe("rendered site preview destinations", () => {
  const routes = {
    articles: "/blog/{{slug}}/",
    "press-releases": "/press-releases/{{slug}}/",
    interventions: "/interventions/{{slug}}/",
    conferences: "/conferences/{{slug}}/",
    speakers: "/conferences/",
    programs: "/programs/{{slug}}/",
    books: "/books/{{slug}}/",
    authors: "/authors/{{slug}}/",
    "book-readings": "/book-readings/{{slug}}/",
    "general-body-meetings":
      "/organization/general-body/#general-body-meetings",
    comics: "/comics/{{slug}}/",
    "toolkit-scenarios": "/anti-caste-toolkit/#{{slug}}",
    topics: "/blog/",
    categories: "/blog/",
  };

  it("explains build-based draft visibility beside every draft switch", () => {
    for (const collection of config.collections) {
      const draft = collection.fields?.find((field) => field.name === "draft");
      if (draft) {
        expect(draft.hint).toContain("including deployment previews");
        expect(draft.hint).toContain("separate from the CMS workflow");
      }
    }
  });

  it("covers every collection, including records embedded in a parent page", () => {
    expect(config.site_url).toBe("https://akscusa.org");
    expect(
      config.collections.map((collection) => collection.name).sort(),
    ).toEqual(Object.keys(routes).sort());
    for (const [name, expected] of Object.entries(routes)) {
      expect(collectionNamed(name).preview_path).toBe(expected);
      const pathname = expected.split("#")[0].replace(/^\/|\/$/g, "");
      const route = pathname.includes("{{slug}}")
        ? `${pathname.replace("{{slug}}", "[slug]")}.astro`
        : `${pathname}/index.astro`;
      expect(existsSync(join(projectRoot, "app/pages", route)), route).toBe(
        true,
      );
    }
  });
});
