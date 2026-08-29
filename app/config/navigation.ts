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

/**
 * AKSC itself: what it is, what governs it, how it meets, and the two ways a
 * reader acts on the organisation rather than on its work.
 *
 * The constitution and the general body were reachable only from the
 * organisation page and a footer list respectively, which asked a reader to
 * already know they existed. Contact and Donate join them because both are
 * approaches to the organisation, and a reader looking for either was reading
 * to the bottom of the page to find it.
 */
export const organizationNavigation = {
  label: "Organization",
  href: "/organization",
  overviewLabel: "About AKSC",
  children: [
    {
      label: "Contact",
      href: "/contact",
    },
    {
      label: "Constitution",
      href: "/organization/constitution",
    },
    {
      label: "General Body",
      href: "/organization/general-body",
    },
    {
      label: "Donate",
      href: "/donate",
    },
  ],
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
  organizationNavigation,
] as const satisfies readonly NavigationNode[];

/**
 * The one action carried on every page, in the bar and at the top of the
 * mobile sheet.
 *
 * It is membership rather than money. AKSC's own account of itself is that
 * "the eradication of caste requires extensive mobilization, achievable by
 * establishing a lasting base from the masses through membership"; a site
 * whose single highlighted action was Donate asked every reader for the one
 * thing the organisation says is not the point. Donating is still offered,
 * under Organization and from the join page, as one way to take part among
 * several; it is a link in a menu rather than the button the bar ends on.
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
 * General Body, Donate, and Contact were here until they became children of
 * Organization. The footer flattens the tree, so all three are still one link
 * from the bottom of every page; listing them twice would only make the
 * footer's own column disagree with itself about where they live.
 */
export const secondaryNavigation = [
  {
    label: "Anti-caste Toolkit",
    href: "/anti-caste-toolkit",
  },
] as const satisfies readonly NavigationItem[];
