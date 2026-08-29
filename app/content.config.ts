import { books, bookReadings } from "~/schemas/books";
import { comics, toolkitScenarios } from "~/schemas/artwork";
import {
  articles,
  conferences,
  interventions,
  pressReleases,
  programs,
  speakers,
} from "~/schemas/editorial";
import { generalBodyMeetings } from "~/schemas/organization";
import { pages } from "~/schemas/pages";

/**
 * Every content collection on the site, in one place because Astro requires it.
 *
 * The schemas themselves live in `app/schemas/`, one file per domain, so this
 * file stays a table of contents rather than growing into the place where all
 * content modelling happens. To change a field, open the domain file; to add a
 * collection, define it there and list it here.
 */
export const collections = {
  pages,
  books,
  bookReadings,
  articles,
  pressReleases,
  interventions,
  conferences,
  speakers,
  programs,
  generalBodyMeetings,
  comics,
  toolkitScenarios,
};
