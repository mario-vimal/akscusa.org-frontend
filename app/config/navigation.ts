import { actionCollections } from "~/features/actions/sections";
import { editorialSections } from "~/features/editorial/sections";
import type {
  NavigationGroup,
  NavigationItem,
  NavigationNode,
} from "~/lib/navigation";

/**
 * A link to an editorial section, taken from the section's own definition
 * rather than restated. A section that is renamed or moved would otherwise end
 * up with one name in the bar and another on its own masthead, and nothing
 * would say which was right.
 */
const sectionLink = (
  collection: keyof typeof editorialSections,
): NavigationItem => ({
  label: editorialSections[collection].label,
  href: editorialSections[collection].path,
});

/**
 * What AKSC does, gathered under one item.
 *
 * Interventions, statements, conferences, and programs were four of the nine
 * links in a bar that only fitted from 1280px up, and telling them apart
 * required already knowing the site. They are one subtree now, with a page of
 * its own at the root of it, so the bar is short enough to read and the four
 * sections are introduced somewhere rather than merely listed.
 *
 * Only the menu nests. Each section keeps the URL it was migrated to, because
 * a published address is a promise, and the hub is a way in rather than a new
 * parent for a hundred entries.
 */
export const actionsNavigation = {
  label: "Actions",
  href: "/actions",
  children: actionCollections.map(sectionLink),
} as const satisfies NavigationGroup;

export const primaryNavigation = [
  actionsNavigation,
  {
    label: "Testimonies",
    href: "/testimonies-of-practice-of-caste-in-the-usa",
  },
  sectionLink("articles"),
  sectionLink("bookReadings"),
  {
    label: "Comics",
    href: "/comics",
  },
  {
    label: "Organization",
    href: "/organization",
  },
] as const satisfies readonly NavigationNode[];

/**
 * The one action carried on every page, in the bar and at the top of the
 * mobile sheet.
 *
 * It is membership rather than money. AKSC's own account of itself is that
 * "the eradication of caste requires extensive mobilization, achievable by
 * establishing a lasting base from the masses through membership"; a site
 * whose single highlighted action was Donate asked every reader for the one
 * thing the organisation says is not the point. Donating is still offered, in
 * the footer and from the join page, as one way to take part among several.
 */
export const joinNavigation = {
  label: "Join AKSC",
  href: "/join",
} as const satisfies NavigationItem;

/**
 * The helpline sits in the strip above the header rather than in the primary
 * bar. Someone who needs it is not browsing the site, and the strip can carry
 * the phone number and the "facing casteism?" question that a bar of section
 * names cannot. The footer remains its secondary route once the strip scrolls
 * away.
 */
export const helplineNavigation = {
  label: "Anti-Caste Helpline",
  href: "/anti-caste-helpline",
} as const satisfies NavigationItem;

/**
 * Pages that belong in the footer rather than the header. These are pages a
 * reader looks for deliberately rather than browses. The toolkit is reached
 * from the comics and from the testimonies as well, because both readers
 * arrive at it wanting the same thing: something to say next time.
 *
 * Donate is here rather than in the bar. Someone who has decided to give will
 * look for it; nobody needs it held in front of them on every page.
 */
export const secondaryNavigation = [
  {
    label: "Anti-caste Toolkit",
    href: "/anti-caste-toolkit",
  },
  {
    label: "General Body",
    href: "/organization/general-body",
  },
  {
    label: "Donate",
    href: "/donate",
  },
  {
    label: "Contact",
    href: "/contact",
  },
] as const satisfies readonly NavigationItem[];
