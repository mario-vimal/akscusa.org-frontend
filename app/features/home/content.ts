import type { CollectionEntry } from "astro:content";

export type HomePageData = Extract<
  CollectionEntry<"pages">["data"],
  { pageType: "home" }
>;
