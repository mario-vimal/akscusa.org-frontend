import { getCollection, type CollectionEntry } from "astro:content";

type Conference = CollectionEntry<"conferences">;
export type Speaker = CollectionEntry<"speakers">;

const isPublished = (speaker: Speaker) =>
  import.meta.env.DEV || !speaker.data.draft;

export async function loadConferenceSpeakers(
  conference: Conference,
): Promise<Speaker[]> {
  const speakers = (await getCollection("speakers")).filter(isPublished);
  const byId = new Map(speakers.map((speaker) => [speaker.id, speaker]));

  return conference.data.speakers.map((id) => {
    const speaker = byId.get(id);

    if (!speaker) {
      throw new Error(
        `Conference "${conference.id}" references missing or unpublished speaker "${id}".`,
      );
    }

    return speaker;
  });
}
