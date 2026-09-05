import { getEntry, type CollectionEntry } from "astro:content";

export async function loadPage(id: string): Promise<CollectionEntry<"pages">> {
  const entry = await getEntry("pages", id);

  if (!entry) {
    throw new Error(`Static page content "${id}" is missing.`);
  }

  return entry;
}
