import { fileURLToPath } from "node:url";

import sharp from "sharp";

/**
 * Cuts the emblem out of the official AKSC logo.
 *
 * The master logo is a lockup: the emblem — Ambedkar and King drawn over the
 * map of the United States, inside a ring — sitting above an "AKSC" block and
 * an "Ambedkar King Study Circle" strip. The header and the footer already set
 * that wordmark, so a page that also wants the mark behind its masthead wants
 * the emblem alone. Repeating the words at display size would say the
 * organisation's name three times on one screen.
 *
 * The master is stored trimmed to its ink, with no transparent margin around
 * it. That is what lets a caller align the whole lockup to the bottom or the
 * edge of a panel and have it land where it looks like it should, rather than
 * floating an eighth of its height above the line it was aligned to.
 *
 * The cut is measured rather than typed in. The lockup's three parts are
 * separated by fully transparent rows, so the emblem is everything above the
 * first such gap, trimmed to its own ink on the left and right. Hardcoded pixel
 * offsets would silently cut the logo in the wrong place the day someone
 * redraws it; this fails loudly instead, because a logo without a gap has no
 * emblem to take.
 *
 * The colours are left exactly as drawn. The site reduces photography to the
 * brand blue with `duotone`, but AKSC's own artwork keeps its own colours, and
 * the emblem is the strongest case of that rule: the blue is the brand's.
 */

const source = fileURLToPath(
  new URL("../app/assets/brand/aksc-logo.webp", import.meta.url),
);
const destination = fileURLToPath(
  new URL("../app/assets/brand/aksc-emblem.webp", import.meta.url),
);

// A pixel this faint is antialiasing at the edge of a stroke, not artwork.
const ALPHA_FLOOR = 8;

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const alphaAt = (x, y) => data[(y * width + x) * channels + 3];

const rowHasInk = [];
for (let y = 0; y < height; y += 1) {
  let found = false;
  for (let x = 0; x < width && !found; x += 1) {
    found = alphaAt(x, y) > ALPHA_FLOOR;
  }
  rowHasInk.push(found);
}

const top = rowHasInk.indexOf(true);
if (top === -1) {
  throw new Error("The logo is empty: no row of it carries any ink.");
}

// The first run of blank rows below the artwork is the space under the emblem.
let bottom = -1;
for (let y = top; y < height; y += 1) {
  if (!rowHasInk[y]) {
    bottom = y - 1;
    break;
  }
}

if (bottom === -1) {
  throw new Error(
    "The logo has no blank row below its emblem, so the wordmark cannot be " +
      "separated from it. Check that the source is still the full lockup.",
  );
}

let left = width;
let right = -1;
for (let y = top; y <= bottom; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (alphaAt(x, y) > ALPHA_FLOOR) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
}

const cut = {
  left,
  top,
  width: right - left + 1,
  height: bottom - top + 1,
};

// Near-lossless rather than the quality 82 the photographs are served at. The
// emblem is flat-colour line art, and the artefacts a lossy encoder leaves
// around a hard edge are exactly what shows up on it.
await sharp(source)
  .extract(cut)
  .webp({ quality: 95, alphaQuality: 100, effort: 6 })
  .toFile(destination);

console.log(
  `Cut the emblem at ${cut.width}x${cut.height} from ${cut.left},${cut.top}.`,
);
