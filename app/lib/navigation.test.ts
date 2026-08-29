import { describe, expect, it } from "vitest";

import {
  flattenNavigation,
  isCurrentNode,
  isCurrentPath,
  isNavigationGroup,
  overviewLabelFor,
  type NavigationGroup,
  type NavigationItem,
  type NavigationNode,
} from "./navigation";

const interventions: NavigationItem = {
  label: "Interventions",
  href: "/interventions",
};
const pressReleases: NavigationItem = {
  label: "Press Releases",
  href: "/press-releases",
};
const comics: NavigationItem = { label: "Comics", href: "/comics" };
const actions: NavigationGroup = {
  label: "Actions",
  href: "/actions",
  children: [interventions, pressReleases],
};
const tree: readonly NavigationNode[] = [actions, comics];

describe("isCurrentPath", () => {
  it("matches the page itself with or without a trailing slash", () => {
    expect(isCurrentPath("/interventions/", "/interventions")).toBe(true);
    expect(isCurrentPath("/interventions", "/interventions")).toBe(true);
  });

  it("matches a page inside the section", () => {
    expect(
      isCurrentPath("/interventions/yes-on-sb-403/", "/interventions"),
    ).toBe(true);
  });

  it("stops at a path segment boundary", () => {
    expect(isCurrentPath("/interventions-archive/", "/interventions")).toBe(
      false,
    );
  });

  it("only matches the home page exactly", () => {
    expect(isCurrentPath("/", "/")).toBe(true);
    expect(isCurrentPath("/comics/", "/")).toBe(false);
  });
});

describe("isCurrentNode", () => {
  it("marks a group while the reader is inside one of its children", () => {
    expect(isCurrentNode("/press-releases/some-statement/", actions)).toBe(
      true,
    );
  });

  it("marks a group on its own landing page", () => {
    expect(isCurrentNode("/actions/", actions)).toBe(true);
  });

  it("leaves a group unmarked elsewhere", () => {
    expect(isCurrentNode("/comics/", actions)).toBe(false);
  });

  it("does not claim a sibling for a plain item", () => {
    expect(isCurrentNode("/interventions/", comics)).toBe(false);
  });
});

describe("flattenNavigation", () => {
  it("lists a group before its own children", () => {
    expect(flattenNavigation(tree).map((item) => item.href)).toEqual([
      "/actions",
      "/interventions",
      "/press-releases",
      "/comics",
    ]);
  });

  it("keeps every destination in the tree reachable", () => {
    expect(flattenNavigation(tree)).toHaveLength(4);
  });
});

describe("isNavigationGroup", () => {
  it("tells a group from a plain item", () => {
    expect(isNavigationGroup(actions)).toBe(true);
    expect(isNavigationGroup(comics)).toBe(false);
  });
});

describe("overviewLabelFor", () => {
  it("names the group's own page after the group by default", () => {
    expect(overviewLabelFor(actions)).toBe("All actions");
  });

  it("prefers a label the group states for itself", () => {
    const organization: NavigationGroup = {
      label: "Organization",
      href: "/organization",
      overviewLabel: "About AKSC",
      children: [comics],
    };

    expect(overviewLabelFor(organization)).toBe("About AKSC");
  });
});
