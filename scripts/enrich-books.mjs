#!/usr/bin/env node
/**
 * Fills in what a book entry does not say, from its ISBN.
 *
 * Cover art is fetched from Open Library and stored under
 * `app/features/books/assets/covers/<isbn>.jpg`, and any of the optional
 * bibliographic fields left blank — subtitle, publisher, edition year, first
 * publication year — is written into the entry's frontmatter. A value an editor
 * typed is never replaced, and `summary` is never fetched: that sentence is
 * AKSC's own.
 *
 * Both are committed, so Astro optimizes the cover at build time and the build
 * itself never calls a third party. `.github/workflows/enrich-books.yml` runs
 * this on the pull request Sveltia opens for a new book, so an editor who knows
 * only the ISBN still gets a complete entry.
 *
 *   node scripts/enrich-books.mjs               # fill anything missing
 *   node scripts/enrich-books.mjs --force       # refetch every cover
 *   node scripts/enrich-books.mjs --covers-only # skip the frontmatter pass
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { prepareCover } from "./books/cover.ts";
import { readBookEntries, COVERS_DIR } from "./books/entries.ts";
import { fieldsToFill } from "./books/fields.ts";
import { writeFrontmatterFields } from "./books/frontmatter.ts";
import { fetchCover, fetchRecord } from "./books/open-library.ts";

const force = process.argv.includes("--force");
const coversOnly = process.argv.includes("--covers-only");

const relative = (file) => path.relative(process.cwd(), file);

/** Stores the cover for one book, unless it already has one. */
async function coverFor(book) {
  if (!force && existsSync(book.cover)) {
    return "present";
  }

  const source = await fetchCover(book.isbn);

  if (!source) {
    return "unavailable";
  }

  const { data, width, height } = await prepareCover(source);
  await writeFile(book.cover, data);

  console.log(
    `Cover  ${relative(book.cover)} (${width}x${height}, ${Math.round(data.length / 1024)} KB)`,
  );

  return "written";
}

/** Fills the blank bibliographic fields of one book. Returns what it filled. */
async function detailsFor(book) {
  const record = await fetchRecord(book.isbn);
  const fields = fieldsToFill(book.data, record);
  const names = Object.keys(fields);

  if (names.length === 0) {
    return [];
  }

  await writeFile(book.file, writeFrontmatterFields(book.source, fields));
  console.log(`Fields ${book.label}: ${names.join(", ")}`);

  return names;
}

async function main() {
  const books = await readBookEntries();
  await mkdir(COVERS_DIR, { recursive: true });

  let covers = 0;
  let filled = 0;
  const withoutCover = [];

  for (const book of books) {
    const outcome = await coverFor(book);

    if (outcome === "written") covers += 1;
    if (outcome === "unavailable") {
      withoutCover.push(`${book.title} (${book.isbn})`);
    }

    if (!coversOnly && (await detailsFor(book)).length > 0) {
      filled += 1;
    }
  }

  console.log(
    `\n${books.length} books: ${covers} covers written, ${filled} entries filled in.`,
  );

  // Reported rather than fatal. A book whose cover art is nowhere in Open
  // Library still publishes, and the pages render it without one.
  if (withoutCover.length > 0) {
    console.log("\nNo cover on Open Library for:");
    for (const entry of withoutCover) console.log(`  - ${entry}`);
    console.log(
      "\nThose books render without a cover. To give one a cover by hand, " +
        `commit it as ${path.relative(process.cwd(), COVERS_DIR)}/<isbn>.jpg; ` +
        "a cover already on disk is never refetched.",
    );
  }
}

await main();
