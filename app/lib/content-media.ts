import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const mediaTypes: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const identifier = /^[a-z0-9_~-]+$/;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const isAssetFilename = (name: string): boolean =>
  /^[a-z0-9_~-]+\.[a-z]+$/.test(name) &&
  Object.hasOwn(mediaTypes, extname(name));

export interface ContentMediaOptions {
  /** The source project root, not a bundled module's location. */
  root?: string;
}

export interface ContentMediaAsset {
  publicPath: string;
  filePath: string;
  contentType: string;
  size: number;
}

interface MediaLocation {
  publicPath: string;
  source: string[];
  record?: string[];
}

const isMissing = (error: unknown): boolean =>
  error instanceof Error &&
  "code" in error &&
  (error.code === "ENOENT" || error.code === "ENOTDIR");

async function maybeStat(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

function locationOf(src: string): MediaLocation | undefined {
  // URL() normalizes dot segments before they can be rejected. Decode each
  // segment once instead, so encoded separators and traversal stay invalid.
  const pathname = src.split(/[?#]/, 1)[0];
  let segments: string[];
  try {
    segments = pathname.split("/").map(decodeURIComponent);
  } catch (error) {
    if (error instanceof URIError) return undefined;
    throw error;
  }

  const [leading, namespace, collection, ...rest] = segments;
  if (leading !== "" || namespace !== "media" || !collection) return undefined;
  const name = rest.at(-1);
  if (!name || !isAssetFilename(name)) return undefined;
  if (
    ![collection, ...rest.slice(0, -1)].every((part) => identifier.test(part))
  ) {
    return undefined;
  }

  const publicPath = segments.join("/");
  if (collection === "shared") {
    return {
      publicPath,
      source: ["cms", "public", "media", "shared", ...rest],
    };
  }

  if (rest.length !== 2) return undefined;
  const [slug] = rest;
  const directory = ["cms", "content", collection, slug];
  return {
    publicPath,
    source: [...directory, name],
    record: [...directory, "index.md"],
  };
}

/**
 * Reject every symlink, including directory links inside a record. Merely
 * checking the final filename would allow an ancestor to escape its owner.
 */
async function sourcePath(
  root: string,
  parts: readonly string[],
  kind: "file" | "directory",
): Promise<string | undefined> {
  let path = root;
  for (const [index, part] of parts.entries()) {
    path = join(path, part);
    const stat = await maybeStat(path);
    if (!stat || stat.isSymbolicLink()) return undefined;
    const needsDirectory = index < parts.length - 1 || kind === "directory";
    if (needsDirectory ? !stat.isDirectory() : !stat.isFile()) return undefined;
  }
  try {
    return (await realpath(path)) === path ? path : undefined;
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

function hasAssetSignature(header: Buffer, type: string): boolean {
  switch (type) {
    case "image/jpeg":
      return header[0] === 255 && header[1] === 216 && header[2] === 255;
    case "image/png":
      return header.subarray(0, 8).equals(pngSignature);
    case "image/webp":
      return (
        header.toString("ascii", 0, 4) === "RIFF" &&
        header.toString("ascii", 8, 12) === "WEBP"
      );
    case "application/pdf":
      return header.toString("ascii", 0, 5) === "%PDF-";
    default:
      return false;
  }
}

async function resolveAt(
  location: MediaLocation,
  root: string,
): Promise<ContentMediaAsset | undefined> {
  if (location.record && !(await sourcePath(root, location.record, "file"))) {
    return undefined;
  }
  const filePath = await sourcePath(root, location.source, "file");
  if (!filePath) return undefined;

  const contentType = mediaTypes[extname(filePath)];
  try {
    const file = await open(
      filePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const stat = await file.stat();
      if (!stat.isFile()) return undefined;
      const header = Buffer.alloc(16);
      const { bytesRead } = await file.read(header, 0, header.length, 0);
      if (!hasAssetSignature(header.subarray(0, bytesRead), contentType)) {
        return undefined;
      }
      return {
        publicPath: location.publicPath,
        filePath,
        contentType,
        size: stat.size,
      };
    } finally {
      await file.close();
    }
  } catch (error) {
    if (
      isMissing(error) ||
      (error instanceof Error && "code" in error && error.code === "ELOOP")
    ) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Resolve public media only: PNG/JPEG/WebP/PDF files next to a record's
 * index.md, or genuinely shared files under cms/public/media/shared.
 *
 * Assets remain public independently of HTML draft status, as uploaded media
 * already was. The index is checked for ownership, never read for publication.
 * Invalid/private/missing targets return undefined; unexpected I/O errors throw.
 */
export async function resolveContentMedia(
  src: string,
  options: ContentMediaOptions = {},
): Promise<ContentMediaAsset | undefined> {
  const location = locationOf(src);
  if (!location) return undefined;
  return resolveAt(
    location,
    await realpath(resolve(options.root ?? process.cwd())),
  );
}

/** The same allowlist and resolver govern both serving and build discovery. */
export async function listContentMedia(
  options: ContentMediaOptions = {},
): Promise<ContentMediaAsset[]> {
  const root = await realpath(resolve(options.root ?? process.cwd()));
  const assets: ContentMediaAsset[] = [];

  async function directory(parts: readonly string[]) {
    const path = await sourcePath(root, parts, "directory");
    if (path) return readdir(path, { withFileTypes: true });
    if (await maybeStat(join(root, ...parts))) {
      throw new Error(
        `Content media directory must not be a symlink: ${join(root, ...parts)}`,
      );
    }
    return [];
  }

  async function add(publicPath: string) {
    const location = locationOf(publicPath);
    const asset = location && (await resolveAt(location, root));
    if (!asset) {
      throw new Error(
        `Cannot publish media "${publicPath}": expected a regular PNG/JPEG/WebP/PDF file without symlinks.`,
      );
    }
    assets.push(asset);
  }

  for (const collection of await directory(["cms", "content"])) {
    if (!identifier.test(collection.name) || collection.isFile()) continue;
    const collectionPath = ["cms", "content", collection.name];
    for (const entry of await directory(collectionPath)) {
      if (!identifier.test(entry.name) || entry.isFile()) continue;
      const entryPath = [...collectionPath, entry.name];
      const marker = [...entryPath, "index.md"];
      if (!(await sourcePath(root, marker, "file"))) {
        if (await maybeStat(join(root, ...marker))) {
          throw new Error(
            `Content media owner must have a regular index.md: ${join(root, ...entryPath)}`,
          );
        }
        continue;
      }
      for (const file of await directory(entryPath)) {
        if (isAssetFilename(file.name)) {
          await add(`/media/${collection.name}/${entry.name}/${file.name}`);
        }
      }
    }
  }

  async function shared(parts: readonly string[]) {
    for (const item of await directory([
      "cms",
      "public",
      "media",
      "shared",
      ...parts,
    ])) {
      if (isAssetFilename(item.name)) {
        await add(["", "media", "shared", ...parts, item.name].join("/"));
      } else if (identifier.test(item.name) && !item.isFile()) {
        await shared([...parts, item.name]);
      }
    }
  }
  await shared([]);

  return assets.sort((a, b) =>
    a.publicPath < b.publicPath ? -1 : a.publicPath > b.publicPath ? 1 : 0,
  );
}
