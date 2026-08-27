#!/usr/bin/env node
/**
 * Fetches book cover art from Open Library and stores it under
 * `app/features/books/assets/covers/<isbn>.jpg`, so Astro can optimize the
 * images at build time instead of the site hotlinking a third party.
 *
 * Covers are keyed by the ISBN of the edition read, which is the same key that
 * links a reading to its book, so nothing has to be wired up by hand.
 *
 *   node scripts/fetch-book-covers.mjs          # fetch anything missing
 *   node scripts/fetch-book-covers.mjs --force  # refetch everything
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";
import { parse } from "yaml";

const BOOKS_DIR = "cms/content/books";
const COVERS_DIR = "app/features/books/assets/covers";
/** Open Library serves a placeholder unless default=false asks it not to. */
const coverUrl = (isbn) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

const force = process.argv.includes("--force");

function frontmatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`${file} has no frontmatter.`);
  }
  return parse(match[1]);
}

async function readBooks() {
  const files = (await readdir(BOOKS_DIR)).filter((name) =>
    name.endsWith(".md"),
  );

  return Promise.all(
    files.map(async (name) => {
      const file = path.join(BOOKS_DIR, name);
      const data = frontmatter(await readFile(file, "utf8"), file);
      if (!data.isbn) {
        throw new Error(`${file} has no isbn.`);
      }
      return { file, isbn: String(data.isbn), title: data.title };
    }),
  );
}

/**
 * Open Library pads some covers onto a square canvas. Trimming that flat border
 * gives back the real cover, so the aspect ratio on the page is the book's own.
 */
async function normalize(buffer) {
  const trimmed = await sharp(buffer)
    .trim({ threshold: 12 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return trimmed;
}

async function main() {
  const books = await readBooks();
  await mkdir(COVERS_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  const missing = [];

  for (const book of books) {
    const target = path.join(COVERS_DIR, `${book.isbn}.jpg`);

    if (!force && existsSync(target)) {
      skipped += 1;
      continue;
    }

    const response = await fetch(coverUrl(book.isbn));
    if (!response.ok) {
      missing.push(`${book.title} (${book.isbn}): HTTP ${response.status}`);
      continue;
    }

    const source = Buffer.from(await response.arrayBuffer());
    const { data, info } = await normalize(source);
    await writeFile(target, data);

    written += 1;
    console.log(
      `Saved ${target} (${info.width}x${info.height}, ${Math.round(data.length / 1024)} KB)`,
    );
  }

  console.log(
    `\n${written} written, ${skipped} already present, ${missing.length} unavailable.`,
  );

  if (missing.length > 0) {
    console.log("\nNo cover on Open Library for:");
    for (const entry of missing) console.log(`  - ${entry}`);
    console.log(
      "\nThose books simply render without a cover, which the pages handle.",
    );
  }
}

await main();
