import { constants } from "node:fs";
import { copyFile, lstat, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  listContentMedia,
  type ContentMediaAsset,
  type ContentMediaOptions,
} from "#content-media";

export interface CopyContentMediaOptions extends ContentMediaOptions {
  outDir: string;
}

const contains = (parent: string, child: string): boolean => {
  const path = relative(parent, child);
  return (
    path === "" ||
    (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`))
  );
};

async function ensureDirectory(root: string, destination: string) {
  let path = root;
  for (const part of relative(root, destination).split(sep)) {
    path = join(path, part);
    try {
      await mkdir(path);
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      )) {
        throw error;
      }
    }
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(
        `Media build destination must be a regular directory: ${path}`,
      );
    }
  }
}

/**
 * Own the generated /media tree, including shared files. Replacing that tree
 * also removes stale uploads and private files copied by Astro's publicDir
 * handling; Markdown/config/source files must never become media endpoints.
 */
export async function copyContentMedia(
  options: CopyContentMediaOptions,
): Promise<ContentMediaAsset[]> {
  const root = await realpath(resolve(options.root ?? process.cwd()));
  const outDir = resolve(root, options.outDir);
  const mediaDir = join(outDir, "media");
  if (outDir === root || !contains(root, outDir)) {
    throw new Error(
      "Media build output must be a separate directory inside the project root.",
    );
  }
  for (const source of [
    join(root, "cms", "content"),
    join(root, "cms", "public"),
  ]) {
    if (contains(source, outDir) || contains(outDir, source)) {
      throw new Error(
        "Media build output must not overlap CMS source directories.",
      );
    }
  }

  // Validate every source before replacing any previous build output.
  const assets = await listContentMedia({ root });
  await ensureDirectory(root, mediaDir);
  await rm(mediaDir, { recursive: true });
  await mkdir(mediaDir);

  for (const asset of assets) {
    const destination = join(outDir, asset.publicPath.slice(1));
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(asset.filePath, destination, constants.COPYFILE_EXCL);
  }
  return assets;
}
