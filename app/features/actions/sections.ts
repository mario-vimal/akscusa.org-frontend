import type { EditorialCollection } from "~/features/editorial/sections";

/**
 * The editorial sections gathered under Actions, in the order the hub and the
 * menu list them: the work itself, the statements that carry it into public,
 * the conference the year turns on, and the programs that run between them.
 *
 * This list is the subtree. `~/config/navigation` builds the menu from it and
 * the hub at `/actions/` builds its index from it, so a section cannot be in
 * the menu and missing from the page it belongs to.
 */
export const actionCollections = [
  "interventions",
  "pressReleases",
  "conferences",
  "programs",
] as const satisfies readonly EditorialCollection[];

export type ActionCollection = (typeof actionCollections)[number];

/**
 * Masthead copy for the hub. The sections beneath it describe themselves in
 * `editorialSections`, so the only sentence written here is the one that says
 * why these four are one thing.
 */
export const actionsPage = {
  eyebrow: "What we do",
  title: "Actions",
  description:
    "Campaigns and legal work, the statements that carry them into public, the annual conference, and the programs AKSC runs between them.",
} as const;
