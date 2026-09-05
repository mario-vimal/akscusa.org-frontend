import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { afterAll } from "vitest";

const directory = fileURLToPath(
  new URL(`./.fixtures-${randomUUID()}/`, import.meta.url),
);
let sequence = 0;

afterAll(() => rm(directory, { recursive: true, force: true }));

const image = sharp({
  create: {
    width: 2,
    height: 2,
    channels: 3,
    background: { r: 10, g: 20, b: 30 },
  },
});
export const png = await image.clone().png().toBuffer();
export const jpeg = await image.clone().jpeg().toBuffer();
export const webp = await image.clone().webp().toBuffer();
export const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
);

export async function write(
  root: string,
  path: string,
  content: string | Uint8Array,
) {
  const file = join(root, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

export async function fixture(
  files: Readonly<Record<string, string | Uint8Array>> = {},
) {
  const root = join(directory, String(sequence++));
  await mkdir(root, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([path, content]) => write(root, path, content)),
  );
  return root;
}
