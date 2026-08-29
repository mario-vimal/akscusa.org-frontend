import { type CollectionEntry } from "astro:content";

import { sizePanels, type SizedPanel } from "~/features/artwork/panels";
import { loadPublished } from "~/lib/collections";

export type ToolkitScenario = CollectionEntry<"toolkitScenarios">;

/**
 * A playbook is read in the sequence its authors chose, so scenarios are
 * ordered by hand rather than by the date they were added.
 */
const byAuthoredOrder = (a: ToolkitScenario, b: ToolkitScenario) =>
  a.data.order - b.data.order;

export const loadToolkitScenarios = (): Promise<ToolkitScenario[]> =>
  loadPublished("toolkitScenarios", byAuthoredOrder);

/** A scenario as the toolkit page reads it, with its panels measured. */
export interface ScenarioView {
  id: string;
  title: string;
  setting: string;
  summary: string;
  prompt: string;
  panels: SizedPanel[];
  credits: { name: string; role?: string; url?: string }[];
}

/**
 * Every scenario in the toolkit, in the authored order, with panel dimensions
 * read off the committed files so a page of illustrations does not reflow as
 * each one arrives.
 */
export async function loadToolkitScenes(): Promise<ScenarioView[]> {
  const scenarios = await loadToolkitScenarios();

  return Promise.all(
    scenarios.map(async (scenario) => ({
      id: scenario.id,
      title: scenario.data.title,
      setting: scenario.data.setting,
      summary: scenario.data.summary,
      prompt: scenario.data.prompt,
      panels: await sizePanels(scenario.data.panels),
      credits: scenario.data.credits,
    })),
  );
}
