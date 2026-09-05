import sharp from "sharp";

import { resolveContentMedia } from "./content-media";

export interface ImageSize {
  width: number;
  height: number;
}

const sizes = new Map<string, Promise<ImageSize>>();

/**
 * Editorial media is served byte for byte rather than imported through Astro.
 * Use the delivery resolver so measurement cannot silently read a different
 * file from the entry-owned or shared asset that the public URL serves.
 *
 * Reading its header at build time reserves each flyer's own proportions
 * before the image arrives, whether the artwork is upright or landscape.
 *
 * The build is static, so this runs in Node and never in a request.
 */
export function measurePublicImage(src: string): Promise<ImageSize> {
  const cached = sizes.get(src);
  if (cached) return cached;

  const measurement = resolveContentMedia(src)
    .then((asset) => {
      if (!asset || !asset.contentType.startsWith("image/")) {
        throw new Error(`Missing or unsupported public image source: ${src}`);
      }
      return sharp(asset.filePath).metadata();
    })
    .then(({ width, height }) => {
      if (!width || !height) {
        throw new Error(`Could not read the dimensions of ${src}.`);
      }
      return { width, height };
    });

  sizes.set(src, measurement);
  return measurement;
}
