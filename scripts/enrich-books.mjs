#!/usr/bin/env node
/**
 * Fills in what a book entry does not say, from its ISBN.
 *
 * Cover art is fetched from Open Library and stored under
 * `app/features/books/assets/covers/<isbn>.jpg`, and every bibliographic field
 * left blank — title, subtitle, authors, publisher, edition year, first
 * publication year — is written into the entry's frontmatter, so an ISBN is
 * very nearly all an entry has to state. A value an editor typed is never
 * replaced, and `summary` is never fetched: that sentence is AKSC's own.
 *
 * Both are committed, so Astro optimizes the cover at build time and the build
 * itself never calls a third party. `.github/workflows/enrich-books.yml` runs
 * this on the pull request Sveltia opens for a new book, so an editor who knows
 * only the ISBN still gets a complete entry.
 *
 * Missing Open Library data is reported, never fatal — a run that produces no
 * commit is a legitimate outcome, not a failure, so it is written into
 * `$GITHUB_STEP_SUMMARY` as plainly as a run that fetched something, rather
 * than only appearing in a log nobody opens.
 *
 *   node scripts/enrich-books.mjs               # fill anything missing
 *   node scripts/enrich-books.mjs --force       # refetch every cover
 *   node scripts/enrich-books.mjs --covers-only # skip the frontmatter pass
 */
import { existsSync } from "node:fs";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
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

/** Appends to the job summary Actions renders on the run, if one is set. */
async function writeSummary(lines) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;
  await appendFile(summaryFile, lines.join("\n") + "\n");
}

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

/**
 * Fills the blank bibliographic fields of one book. Returns the field names
 * it filled and whether Open Library had any record at all for the ISBN, so
 * the caller can tell "already complete" apart from "nothing to find".
 */
async function detailsFor(book) {
  const record = await fetchRecord(book.isbn);
  const hasRecord = Object.keys(record).length > 0;
  const fields = fieldsToFill(book.data, record);
  const names = Object.keys(fields);

  if (names.length > 0) {
    await writeFile(book.file, writeFrontmatterFields(book.source, fields));
    console.log(`Fields ${book.label}: ${names.join(", ")}`);
  }

  return { names, hasRecord };
}

async function main() {
  const books = await readBookEntries();
  await mkdir(COVERS_DIR, { recursive: true });

  let covers = 0;
  let filled = 0;
  const noCover = [];
  const noOpenLibraryEntry = [];

  for (const book of books) {
    const coverOutcome = await coverFor(book);
    if (coverOutcome === "written") covers += 1;

    const details = coversOnly
      ? { names: [], hasRecord: true }
      : await detailsFor(book);
    if (details.names.length > 0) filled += 1;

    if (coverOutcome === "unavailable") {
      const label = `${book.title} (${book.isbn})`;
      // Neither a cover nor a bibliographic record is worth calling out on
      // its own: Open Library simply has nothing under this ISBN at all,
      // rather than merely lacking artwork.
      (details.hasRecord ? noCover : noOpenLibraryEntry).push(label);
    }
  }

  const summary = [
    `${books.length} book(s) checked: ${covers} cover(s) written, ${filled} ${filled === 1 ? "entry" : "entries"} filled in.`,
  ];

  if (covers === 0 && filled === 0) {
    summary.push(
      "",
      "**Nothing to commit.** Every book already has its cover and bibliographic details, or Open Library had nothing new to add.",
    );
  }

  if (noOpenLibraryEntry.length > 0) {
    summary.push(
      "",
      "**No Open Library entry found for:**",
      ...noOpenLibraryEntry.map((entry) => `- ${entry}`),
      "",
      "This is not a failure — the book still publishes without a cover or the fields Open Library would have filled. Double-check the ISBN if this is unexpected.",
    );
  }

  if (noCover.length > 0) {
    summary.push(
      "",
      "**No cover on Open Library for:**",
      ...noCover.map((entry) => `- ${entry}`),
      "",
      "Those books render without a cover. To give one by hand, commit it as " +
        `${relative(COVERS_DIR)}/<isbn>.jpg; a cover already on disk is never refetched.`,
    );
  }

  console.log(`\n${summary.join("\n")}`);
  await writeSummary(["## Enrich books", "", ...summary]);
}

await main();
