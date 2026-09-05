import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

export interface CmsMediaLibraries {
  all?: { slugify_filename?: boolean };
  default?: false | { config?: { slugify_filename?: boolean } };
  [library: string]: false | Record<string, unknown> | undefined;
}

export interface CmsField {
  name: string;
  label?: string;
  widget?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  collection?: string;
  value_field?: string;
  options?: Array<{ label: string; value: string }>;
  fields?: CmsField[];
  field?: CmsField;
  accept?: string;
  choose_url?: boolean;
  media_libraries?: CmsMediaLibraries;
  pattern?: [string, string];
  format?: string;
  input_timezone?: string;
  output_utc?: boolean;
}

export interface CmsCollection {
  name: string;
  label?: string;
  description?: string;
  folder?: string;
  path?: string;
  create?: boolean;
  identifier_field?: string;
  slug?: string;
  summary?: string;
  thumbnail?: string;
  preview_path?: string;
  media_folder?: string;
  public_folder?: string;
  files?: Array<{ file: string }>;
  fields?: CmsField[];
}

export interface CmsConfig {
  backend: {
    name: string;
    repo: string;
    branch: string;
    squash_merges?: unknown;
  };
  publish_mode?: unknown;
  site_url?: string;
  media_folder?: string;
  public_folder?: string;
  media_libraries?: CmsMediaLibraries;
  slug?: {
    encoding?: string;
    clean_accents?: boolean;
    sanitize_replacement?: string;
    trim?: boolean;
    lowercase?: boolean;
  };
  collections: CmsCollection[];
}

export const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
export const configSource = readFileSync(
  new URL("../../cms/public/admin/config.yml", import.meta.url),
  "utf8",
);

// The complete pinned JSON schema is checked in schema.test.ts. Merge support
// and alias limits mirror Sveltia's config loader, not YAML's different defaults.
export const config = parse(configSource, {
  merge: true,
  maxAliasCount: -1,
}) as CmsConfig;

export function collectionNamed(name: string): CmsCollection {
  const collection = config.collections.find((entry) => entry.name === name);
  if (!collection) throw new Error(`Missing CMS collection: ${name}`);
  return collection;
}

export function fieldNamed(collection: string, path: string): CmsField {
  let fields = collectionNamed(collection).fields;
  let found: CmsField | undefined;

  for (const segment of path.split(".")) {
    found = fields?.find((field) => field.name === segment);
    if (!found) throw new Error(`Missing CMS field: ${collection}.${path}`);
    fields = found.fields ?? (found.field ? [found.field] : undefined);
  }

  if (!found) throw new Error("A CMS field path cannot be empty.");
  return found;
}

export function nestedFields(
  fields: readonly CmsField[] = [],
  prefix = "",
): Array<{ path: string; field: CmsField }> {
  return fields.flatMap((field) => {
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    return [
      { path, field },
      ...nestedFields(field.fields ?? (field.field ? [field.field] : []), path),
    ];
  });
}
