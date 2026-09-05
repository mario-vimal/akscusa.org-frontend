import {
  resolveContentMedia,
  type ContentMediaOptions,
} from "~/lib/content-media";

// A shared media folder outlives the records that first uploaded its files.
// Missing references block publication; retained, unreferenced files do not.
export function missingMedia(
  referenced: readonly string[],
  available: readonly string[],
): string[] {
  const files = new Set(available);
  return [...new Set(referenced)].filter((path) => !files.has(path));
}

export async function missingContentMedia(
  referenced: readonly string[],
  options: ContentMediaOptions = {},
): Promise<string[]> {
  const available = await Promise.all(
    [...new Set(referenced)].map(async (path) =>
      (await resolveContentMedia(path, options)) ? path : undefined,
    ),
  );
  return missingMedia(
    referenced,
    available.filter((path): path is string => path !== undefined),
  );
}
