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
