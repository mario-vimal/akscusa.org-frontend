export interface NavigationItem {
  label: string;
  href: `/${string}`;
}

export const primaryNavigation = [
  {
    label: "Interventions",
    href: "/interventions",
  },
  {
    label: "Testimonies",
    href: "/testimonies-of-practice-of-caste-in-the-usa",
  },
  {
    label: "Blog",
    href: "/blog",
  },
  {
    label: "Press Releases",
    href: "/press-releases",
  },
  {
    label: "Book Readings",
    href: "/book-readings",
  },
  {
    label: "Conferences",
    href: "/conferences",
  },
  {
    label: "Programs",
    href: "/programs",
  },
  {
    label: "Organization",
    href: "/organization",
  },
] as const satisfies readonly NavigationItem[];

export const donateNavigation = {
  label: "Donate",
  href: "/donate",
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
 * Pages that belong in the footer rather than the header. The primary bar is
 * already full at the desktop breakpoint, and these are pages a reader looks
 * for deliberately rather than browses.
 */
export const secondaryNavigation = [
  {
    label: "General Body",
    href: "/organization/general-body",
  },
  {
    label: "Contact",
    href: "/contact",
  },
] as const satisfies readonly NavigationItem[];
