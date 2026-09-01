import { join } from "node:path";

import sharp from "sharp";

export interface ImageSize {
  width: number;
  height: number;
}

/*
 * The same directory `astro.config.mjs` names as `publicDir`, resolved the same
 * way it resolves it: from the directory the build was started in.
 *
 * Deriving it from `import.meta.url` instead is what it looks like it should
 * be, and it is a trap. This module is bundled into `dist/.prerender/chunks/`
 * before it runs, so a relative walk up from the module resolves against the
 * output tree rather than the source tree, and the number of `..` segments that
 * happens to be correct depends on how deep the source file sits. A helper that
 * two features share cannot be pinned to one caller's depth.
 */
const publicDirectory = join(process.cwd(), "cms", "public");

const sizes = new Map<string, Promise<ImageSize>>();

/**
 * Files under `cms/public` are served byte for byte, so Astro never sees them
 * as an import and cannot supply their dimensions. Reading the header at build
 * time gives every one of them a width and a height, which is what keeps a page
 * of images from reflowing as each one arrives.
 *
 * It also lets a picture keep its own proportions in a layout. Hard-coding an
 * aspect ratio instead means letterboxing everything that does not match it,
 * and AKSC's own flyers arrive both upright and landscape.
 *
 * The build is static, so this runs in Node and never in a request.
 */
export function measurePublicImage(src: string): Promise<ImageSize> {
  const cached = sizes.get(src);
  if (cached) return cached;

  const measurement = sharp(join(publicDirectory, src))
    .metadata()
    .then(({ width, height }) => {
      if (!width || !height) {
        throw new Error(`Could not read the dimensions of ${src}.`);
      }
      return { width, height };
    });

  sizes.set(src, measurement);
  return measurement;
}
