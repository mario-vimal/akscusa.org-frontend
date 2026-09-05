import { getCollection, type CollectionEntry } from "astro:content";

import { isPublished } from "~/lib/collections";
import { resolvePublishedReferences } from "~/lib/references";

type Conference = CollectionEntry<"conferences">;
export type Speaker = CollectionEntry<"speakers">;

export async function loadConferenceSpeakers(
  conference: Conference,
): Promise<Speaker[]> {
  const all = await getCollection("speakers");
  const known = new Set(all.map((speaker) => speaker.id));
  const published = new Map(
    all.filter(isPublished).map((speaker) => [speaker.id, speaker]),
  );

  return resolvePublishedReferences(
    conference.data.speakers,
    known,
    published,
    (id) =>
      new Error(
        `Conference "${conference.id}" references speaker "${id}", which has no entry in cms/content/speakers.`,
      ),
  );
}
