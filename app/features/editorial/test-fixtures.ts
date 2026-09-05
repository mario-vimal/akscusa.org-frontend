import type { EditorialEntry } from "./sections";

type Conference = EditorialEntry<"conferences">;
type Program = EditorialEntry<"programs">;

export const conference = (
  id: string,
  date: string,
  data: Partial<Conference["data"]> = {},
): Conference => ({
  id,
  collection: "conferences",
  data: {
    title: id,
    summary: "An annual gathering.",
    date: new Date(date),
    format: "in-person",
    speakers: [],
    resources: [],
    topics: [],
    featured: false,
    draft: false,
    ...data,
  },
});

export const program = (
  id: string,
  date: string,
  data: Partial<Program["data"]> = {},
): Program => ({
  id,
  collection: "programs",
  data: {
    title: id,
    summary: "A public program.",
    date: new Date(date),
    kind: "event",
    status: "concluded",
    organisers: [],
    posters: [],
    resources: [],
    topics: [],
    featured: false,
    draft: false,
    ...data,
  },
});
