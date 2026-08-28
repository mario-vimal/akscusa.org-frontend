import { getCollection, type CollectionEntry } from "astro:content";

export type ToolkitScenario = CollectionEntry<"toolkitScenarios">;

/**
 * Drafts are visible while writing and left out of the build, so a scenario can
 * be previewed with its illustrations before it joins the playbook.
 */
const isPublished = (scenario: ToolkitScenario) =>
  import.meta.env.DEV || !scenario.data.draft;

/**
 * A playbook is read in the sequence its authors chose, so scenarios are
 * ordered by hand rather than by the date they were added.
 */
export async function loadToolkitScenarios(): Promise<ToolkitScenario[]> {
  const scenarios = await getCollection("toolkitScenarios");

  return scenarios
    .filter(isPublished)
    .sort((a, b) => a.data.order - b.data.order);
}
