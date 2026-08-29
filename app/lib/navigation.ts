/**
 * The shape of the site's menu, and the rules for reading it.
 *
 * The tree itself is data and lives in `~/config/navigation`. Only the types
 * and the questions every menu component asks of them are here, kept free of
 * imports so the rules can be tested directly instead of through a rendered
 * header.
 */

/** A single destination in a menu. */
export interface NavigationItem {
  readonly label: string;
  readonly href: `/${string}`;
}

/**
 * A destination that also gathers others beneath it.
 *
 * A group has a page of its own rather than being an inert label that only
 * opens a panel. A reader who follows it from the footer, from a search
 * result, or with a keyboard has to land somewhere, and a menu that is the
 * only way into four sections is a menu that hides them.
 */
export interface NavigationGroup extends NavigationItem {
  readonly children: readonly NavigationItem[];
  /**
   * What the menu's link to the group's own page says, where "All actions"
   * does not read. The fallback suits a group named for a plural of the
   * things beneath it; "All organization" is the sentence that made this
   * optional rather than derived.
   */
  readonly overviewLabel?: string;
}

/** The menu's link back to a group's own page. */
export const overviewLabelFor = (group: NavigationGroup): string =>
  group.overviewLabel ?? `All ${group.label.toLowerCase()}`;

export type NavigationNode = NavigationItem | NavigationGroup;

export const isNavigationGroup = (
  node: NavigationNode,
): node is NavigationGroup => "children" in node;

/** Every URL on this site carries a trailing slash; comparisons do not. */
const normalize = (path: string): string =>
  path === "/" ? path : path.replace(/\/+$/, "");

/**
 * Whether a link points at the page being read, or at a section containing it.
 * The `/` boundary is what stops `/blog` claiming `/blogging`.
 */
export const isCurrentPath = (currentPath: string, href: string): boolean => {
  const current = normalize(currentPath);
  const target = normalize(href);

  if (target === "/") {
    return current === "/";
  }

  return current === target || current.startsWith(`${target}/`);
};

/**
 * Whether a node is where the reader is. A group answers for its children as
 * well: the bar shows one item where the reader sees four sections, so marking
 * only `/actions/` would leave the bar blank on every page inside it.
 */
export const isCurrentNode = (
  currentPath: string,
  node: NavigationNode,
): boolean =>
  isCurrentPath(currentPath, node.href) ||
  (isNavigationGroup(node) &&
    node.children.some((child) => isCurrentPath(currentPath, child.href)));

/**
 * The tree read as a flat list, each parent before its own children. The
 * footer lists every destination rather than reproducing the subtree, so a
 * page that is one level down in the header is still one link away at the
 * bottom of the page.
 */
export const flattenNavigation = (
  nodes: readonly NavigationNode[],
): NavigationItem[] =>
  nodes.flatMap((node) =>
    isNavigationGroup(node) ? [node, ...node.children] : [node],
  );
