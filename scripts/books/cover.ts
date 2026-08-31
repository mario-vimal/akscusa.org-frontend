/**
 * Preparing a fetched cover for the repository.
 *
 * Open Library pads some covers onto a square canvas. Trimming that flat border
 * gives back the real cover, so the aspect ratio on the page is the book's own.
 */

import sharp from "sharp";

export interface PreparedCover {
  data: Buffer;
  width: number;
  height: number;
}

export async function prepareCover(source: Buffer): Promise<PreparedCover> {
  const { data, info } = await sharp(source)
    .trim({ threshold: 12 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height };
}
