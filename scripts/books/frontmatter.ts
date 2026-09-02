/**
 * Reading and editing the frontmatter of a book entry.
 *
 * Sveltia wrote these files, and an editor will open them again, so the whole
 * document is never re-serialized: reformatting the frontmatter would rewrite
 * every entry the CMS touches and lose the shape an editor is used to seeing.
 * A field is filled by editing the one line it lives on, or by inserting a
 * single line where the field belongs, and nothing else in the file moves.
 */

import { parse } from "yaml";

/**
 * Values this module can write: a scalar, or a list of strings. Books hold no
 * field nested deeper than that worth filling.
 */
export type FieldValue = string | number | readonly string[];

const DELIMITED = /^---\r?\n([\s\S]*?)\r?\n---/;

export interface Frontmatter {
  /** The YAML between the delimiters, as written. */
  block: string;
  data: Record<string, unknown>;
}

export function readFrontmatter(source: string, file: string): Frontmatter {
  const match = source.match(DELIMITED);

  if (!match) {
    throw new Error(`${file} has no frontmatter.`);
  }

  const data: unknown = parse(match[1]);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${file} has frontmatter that is not a mapping.`);
  }

  return { block: match[1], data: data as Record<string, unknown> };
}

/**
 * Existing entries quote every string, so a filled field is written the same
 * way. JSON's escaping is a subset of YAML's double-quoted style, which makes
 * a colon, a quote, or an accented character in a subtitle safe to write.
 */
const formatScalar = (value: string | number) =>
  typeof value === "number" ? String(value) : JSON.stringify(value);

/**
 * A list is written as a block sequence indented two spaces, which is what
 * Sveltia writes and what every entry on disk already looks like. An empty
 * list is written inline, because a block sequence with no items is not YAML.
 */
function formatField(key: string, value: FieldValue): string[] {
  if (typeof value === "string" || typeof value === "number") {
    return [`${key}: ${formatScalar(value)}`];
  }

  return value.length === 0
    ? [`${key}: []`]
    : [`${key}:`, ...value.map((item) => `  - ${formatScalar(item)}`)];
}

/** Matches a top-level key, which is the only depth a book field lives at. */
const keyLine = (key: string) => new RegExp(`^${key}:[^\\S\\n]*.*$`);

/**
 * The order `app/schemas/books.ts` states these fields in. A field the entry
 * does not have is written after the last field before it that the entry does
 * have, so a filled entry reads as an editor would have written it, and a
 * field with nothing before it — the title of an entry that never named one —
 * goes to the top of the block.
 */
const FIELD_ORDER: readonly string[] = [
  "title",
  "subtitle",
  "authors",
  "isbn",
  "publisher",
  "publishedYear",
  "firstPublishedYear",
  "summary",
  "topics",
  "resources",
  "draft",
];

/** Which line `key` is written on, or -1 when the entry does not have it. */
const lineOf = (lines: readonly string[], key: string) =>
  lines.findIndex((line) => keyLine(key).test(line));

/**
 * How many lines the field beginning at `at` occupies: its own, plus the
 * indented lines a list or a folded string continues onto.
 */
function span(lines: readonly string[], at: number): number {
  let end = at + 1;

  while (end < lines.length && /^\s+\S/.test(lines[end])) {
    end += 1;
  }

  return end - at;
}

/** Where a field the entry does not have belongs. */
function insertionPoint(lines: readonly string[], key: string): number {
  const position = FIELD_ORDER.indexOf(key);
  const before = position === -1 ? [] : FIELD_ORDER.slice(0, position);

  for (const anchor of [...before].reverse()) {
    const at = lineOf(lines, anchor);

    if (at !== -1) {
      return at + span(lines, at);
    }
  }

  // A field the schema does not name goes to the end, which is correct rather
  // than pretty; one the schema puts first goes first.
  return position === -1 ? lines.length : 0;
}

/**
 * Writes `fields` into the frontmatter of `source`.
 *
 * Only the keys given are touched. A key already present has its value
 * replaced, which is how a field Sveltia serialized as `""` or `null` gets
 * filled; deciding that a value is empty enough to replace belongs to
 * `fieldsToFill`, not here.
 */
export function writeFrontmatterFields(
  source: string,
  fields: Record<string, FieldValue>,
): string {
  const match = source.match(DELIMITED);

  if (!match || match.index === undefined) {
    throw new Error("Cannot write fields into a file with no frontmatter.");
  }

  const lines = match[1].split("\n");

  for (const [key, value] of Object.entries(fields)) {
    const written = formatField(key, value);
    const at = lineOf(lines, key);

    // Replacing takes the whole of the old value with it, so a list an editor
    // left empty does not keep its items under the new ones.
    if (at === -1) {
      lines.splice(insertionPoint(lines, key), 0, ...written);
    } else {
      lines.splice(at, span(lines, at), ...written);
    }
  }

  const block = lines.join("\n");
  const rest = source.slice(match.index + match[0].length);

  return `${source.slice(0, match.index)}---\n${block}\n---${rest}`;
}
