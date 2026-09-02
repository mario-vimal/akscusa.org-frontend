/**
 * The archival portrait an author's page opens with.
 *
 * These live in code rather than in the author entry because each one carries
 * a licence obligation the CMS field cannot express: a photographer to name, a
 * licence to link, and a note that the picture has been cropped and recoloured.
 * The `portrait` field on an author entry holds a URL and an alt text and
 * nothing else, so it is the right place for a photograph AKSC owns and the
 * wrong place for someone else's.
 *
 * An entry's own portrait therefore wins where there is one, and this is the
 * fallback. Two authors have neither, which is why the page is built to open
 * on a name rather than on a face.
 *
 * Sources and licences are recorded in `assets/portraits/SOURCES.md`. Ambedkar
 * and Malcolm X are already on the site and are imported from the shared
 * archive rather than copied here, because the same photograph committed twice
 * is the same photograph to keep in step twice.
 */
import type { ImageMetadata } from "astro";

import ambedkar from "~/assets/shared/leaders/ambedkar-portrait-public-domain.jpg";
import malcolmX from "~/assets/shared/leaders/malcolm-x-public-domain.jpg";
import bellHooks from "./assets/portraits/bell-hooks.jpg";
import gailOmvedt from "./assets/portraits/gail-omvedt.jpg";
import kanchaIlaiah from "./assets/portraits/kancha-ilaiah.jpg";
import periyar from "./assets/portraits/periyar-e-v-ramasamy.jpg";

/** Who made a picture and on what terms it may be shown. */
export interface PortraitCredit {
  creator: string;
  /** The Commons file page, which is where the licence itself is stated. */
  sourceHref: string;
  license: string;
  /** Absent for public domain, which has no licence deed to link to. */
  licenseHref?: string;
}

export interface ArchivalPortrait {
  image: ImageMetadata;
  alt: string;
  credit: PortraitCredit;
}

const CC_BY_SA_4 = {
  license: "CC BY-SA 4.0",
  licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/",
} as const;

const portraits = new Map<string, ArchivalPortrait>([
  [
    "dr-b-r-ambedkar",
    {
      image: ambedkar,
      alt: "A studio portrait in three-quarter profile, in a dark suit, striped tie, and round wire-rimmed glasses.",
      credit: {
        creator: "Unknown photographer / Wikimedia Commons",
        sourceHref:
          "https://commons.wikimedia.org/wiki/File:Dr._Bhimrao_Ambedkar.jpg",
        license: "Public domain",
      },
    },
  ],
  [
    "periyar-e-v-ramasamy",
    {
      image: periyar,
      alt: "A 1924 studio portrait: white hair and beard, round spectacles, and a patterned shawl over one shoulder.",
      credit: {
        creator: "Lakshmi, Tamil monthly, October 1924 / Wikimedia Commons",
        sourceHref:
          "https://commons.wikimedia.org/wiki/File:Erode_Venkatappa_Ramasamy.jpg",
        license: "Public domain",
      },
    },
  ],
  [
    "malcolm-x",
    {
      image: malcolmX,
      alt: "Seated at a press table in a suit and horn-rimmed glasses, resting his head against one hand.",
      credit: {
        creator: "Marion S. Trikosko, Library of Congress / Wikimedia Commons",
        sourceHref: "https://commons.wikimedia.org/wiki/File:Malcolm-x.jpg",
        license: "Public domain",
      },
    },
  ],
  [
    "bell-hooks",
    {
      image: bellHooks,
      alt: "Speaking at a seated public event in a black cardigan and a wide orange scarf, a microphone held beside her.",
      credit: {
        creator: "Alex Lozupone (Tduk) / Wikimedia Commons",
        sourceHref:
          "https://commons.wikimedia.org/wiki/File:Bell_hooks,_October_2014.jpg",
        ...CC_BY_SA_4,
      },
    },
  ],
  [
    "gail-omvedt",
    {
      image: gailOmvedt,
      alt: "Smiling into the camera on a beach at sunset, in a dark shirt, the sea behind her.",
      credit: {
        creator: "Krantivir2014 / Wikimedia Commons",
        sourceHref: "https://commons.wikimedia.org/wiki/File:Gail_Omvedt.JPG",
        ...CC_BY_SA_4,
      },
    },
  ],
  [
    "kancha-ilaiah",
    {
      image: kanchaIlaiah,
      alt: "Seated on a literature festival panel in a white shirt, wearing a festival lanyard.",
      credit: {
        creator: "Sreejithkoiloth / Wikimedia Commons",
        sourceHref: "https://commons.wikimedia.org/wiki/File:Kancha_Ilaiah.jpg",
        ...CC_BY_SA_4,
      },
    },
  ],
]);

export const archivalPortrait = (slug: string): ArchivalPortrait | undefined =>
  portraits.get(slug);
