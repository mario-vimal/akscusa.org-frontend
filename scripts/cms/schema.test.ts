import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { config, configSource } from "./config";
import { sveltiaVersion } from "./editor-fixtures";

// Only string-valued description/markdownDescription annotations were removed
// from the upstream schema; field properties named description are preserved.
// Source: https://unpkg.com/@sveltia/cms@0.201.1/schema/sveltia-cms.json
// Original SHA-256: eb6d813ecb482a4aa11ccc202aa500e806f73f7ed88806a3151fa8a1b9de011c
// Keeping the validation keywords offline avoids an unpinned network gate.
const schema: object = JSON.parse(
  readFileSync(
    new URL("./sveltia-cms-0.201.1.schema.json", import.meta.url),
    "utf8",
  ),
);
const validate = new Ajv({ allErrors: true, jsonPointers: true }).compile(
  schema,
);

describe("pinned Sveltia JSON schema", () => {
  it("keeps the schema snapshot, editor bundle and captured fixtures on one version", () => {
    expect(
      createHash("sha256").update(JSON.stringify(schema)).digest("hex"),
    ).toBe("106d58443c37b1f22bc4c8622c59be22501435694d0a4844421290e18940bc5f");
    expect(configSource).toContain(
      `https://unpkg.com/@sveltia/cms@${sveltiaVersion}/schema/sveltia-cms.json`,
    );
    expect(
      readFileSync(
        new URL("../../cms/public/admin/index.html", import.meta.url),
        "utf8",
      ),
    ).toContain(
      `https://unpkg.com/@sveltia/cms@${sveltiaVersion}/dist/sveltia-cms.js`,
    );
  });

  it("accepts every configured property after resolving YAML aliases", () => {
    const valid = validate(config);
    expect(valid, JSON.stringify(validate.errors?.slice(0, 3))).toBe(true);
  });

  it("rejects the extra property created by an unquoted comma in a flow mapping", () => {
    const brokenField: unknown = parse(
      "{ name: sourceUrl, widget: string, required: false, hint: Where this was first published, if it is being republished here. }",
    );
    const brokenConfig = {
      ...config,
      collections: config.collections.map((collection, index) =>
        index === 0 ? { ...collection, fields: [brokenField] } : collection,
      ),
    };

    expect(validate(brokenConfig)).toBe(false);
    expect(
      validate.errors?.some(
        (error) => error.keyword === "additionalProperties",
      ),
    ).toBe(true);
  });
});
