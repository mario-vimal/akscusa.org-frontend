import { getCollection, type CollectionEntry } from "astro:content";

export type GeneralBodyMeeting = CollectionEntry<"generalBodyMeetings">;

/**
 * Drafts are visible while writing and hidden from the built site, matching how
 * the editorial collections behave.
 */
const isPublished = (entry: GeneralBodyMeeting) =>
  import.meta.env.DEV || !entry.data.draft;

/** Most recent meeting first, which is the one a reader is looking for. */
const byNewestFirst = (a: GeneralBodyMeeting, b: GeneralBodyMeeting) =>
  b.data.edition - a.data.edition;

export async function loadGeneralBodyMeetings(): Promise<GeneralBodyMeeting[]> {
  const meetings = await getCollection("generalBodyMeetings");
  return meetings.filter(isPublished).sort(byNewestFirst);
}
