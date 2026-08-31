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

/** Values this module can write. Books hold no nested field worth filling. */
export type Scalar = string | number;

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
const formatValue = (value: Scalar) =>
  typeof value === "number" ? String(value) : JSON.stringify(value);

/** Matches a top-level key, which is the only depth a book field lives at. */
const keyLine = (key: string) => new RegExp(`^${key}:[^\\S\\n]*.*$`, "m");

/**
 * Where a newly written field belongs, named by the key it follows. The order
 * mirrors `app/schemas/books.ts`, so a filled entry reads as an editor would
 * have written it. A field whose anchor is absent goes to the end of the block,
 * which is correct rather than pretty.
 */
const PRECEDING_KEY: Record<string, string> = {
  subtitle: "title",
  publisher: "isbn",
  publishedYear: "publisher",
  firstPublishedYear: "publishedYear",
};

function insert(block: string, key: string, line: string): string {
  const anchor = PRECEDING_KEY[key];
  const match = anchor ? block.match(keyLine(anchor)) : null;

  if (!match || match.index === undefined) {
    return `${block}\n${line}`;
  }

  // A list or a folded value under the anchor continues onto indented lines,
  // and the new field has to clear them or it lands inside the anchor's value.
  const lines = block.split("\n");
  const anchorLine = block.slice(0, match.index).split("\n").length - 1;

  let at = anchorLine + 1;
  while (at < lines.length && /^(\s+\S|\s*$)/.test(lines[at])) {
    at += 1;
  }

  lines.splice(at, 0, line);
  return lines.join("\n");
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
  fields: Record<string, Scalar>,
): string {
  const match = source.match(DELIMITED);

  if (!match || match.index === undefined) {
    throw new Error("Cannot write fields into a file with no frontmatter.");
  }

  let block = match[1];

  for (const [key, value] of Object.entries(fields)) {
    const line = `${key}: ${formatValue(value)}`;

    block = keyLine(key).test(block)
      ? block.replace(keyLine(key), line)
      : insert(block, key, line);
  }

  const rest = source.slice(match.index + match[0].length);

  return `${source.slice(0, match.index)}---\n${block}\n---${rest}`;
}
