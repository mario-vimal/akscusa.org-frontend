export interface SocialLink {
  label: string;
  href: string;
}

export const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/aksc_ca/",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/p/Ambedkar-King-Study-Circle-California-100079668349387/",
  },
  {
    // A second Facebook presence, carried over from the WordPress contact page.
    // The page publishes announcements; the group is where members talk.
    label: "Facebook Group",
    href: "https://www.facebook.com/groups/1249573841788059",
  },
  {
    label: "X",
    href: "https://x.com/akscsfba?lang=en",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@AmbedkarKingStudyCircleUSA",
  },
  {
    label: "Meetup",
    href: "https://www.meetup.com/ambedkar-king-study-circle-aksc-meetup-group/",
  },
] as const satisfies readonly SocialLink[];
