import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

/**
 * Builds the site's `/favicon.ico`.
 *
 * A tab that is showing a PDF has no HTML document, so the `<link rel="icon">`
 * in `BaseLayout.astro` never reaches the browser and it falls back to
 * `/favicon.ico` at the root of the origin. Without that file the General Body
 * reports open under whatever placeholder icon the browser keeps, so the icon
 * has to exist at that exact unhashed path rather than as a processed asset.
 *
 * Frames are rendered from the 1500px logo rather than from the 64px
 * `favicon.png`, so each size is resampled once from the master instead of
 * twice.
 */

const source = fileURLToPath(
  new URL("../app/assets/brand/aksc-logo.webp", import.meta.url),
);
const destination = fileURLToPath(
  new URL("../cms/public/favicon.ico", import.meta.url),
);

// 16 and 32 cover tabs and bookmarks; 48 covers Windows shortcuts and the
// larger icon Chrome asks for on high density displays.
const sizes = [16, 32, 48];

const frames = await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .resize(size, size, { fit: "contain", background: "#00000000" })
      .png({ compressionLevel: 9, palette: false })
      .toBuffer(),
  ),
);

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;

const header = Buffer.alloc(HEADER_BYTES);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(frames.length, 4);

let offset = HEADER_BYTES + ENTRY_BYTES * frames.length;

const directory = frames.map((frame, index) => {
  const entry = Buffer.alloc(ENTRY_BYTES);
  entry.writeUInt8(sizes[index], 0); // width
  entry.writeUInt8(sizes[index], 1); // height
  entry.writeUInt8(0, 2); // palette size, 0 for true colour
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(frame.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += frame.length;
  return entry;
});

// Every browser the site supports reads PNG frames inside an ICO container,
// which keeps the alpha channel that a BMP frame would have to fake.
await writeFile(destination, Buffer.concat([header, ...directory, ...frames]));

console.log(`Wrote favicon.ico with ${sizes.join(", ")} pixel frames.`);
