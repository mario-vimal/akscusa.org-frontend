import { type CollectionEntry } from "astro:content";

import { loadPublished } from "~/lib/collections";

export type GeneralBodyMeeting = CollectionEntry<"generalBodyMeetings">;

/**
 * A meeting is identified by its edition rather than a date, so the newest is
 * the highest number. That is the one a reader is looking for.
 */
const byLatestEdition = (a: GeneralBodyMeeting, b: GeneralBodyMeeting) =>
  b.data.edition - a.data.edition;

export const loadGeneralBodyMeetings = (): Promise<GeneralBodyMeeting[]> =>
  loadPublished("generalBodyMeetings", byLatestEdition);
