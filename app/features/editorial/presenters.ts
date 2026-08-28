/**
 * Turns a stored entry into the handful of strings each page prints. Keeping
 * this out of the `.astro` files keeps the sections consistent and
 * the templates stay declarative.
 */
import {
  editorialSections,
  formatDate,
  formatDateRange,
  ordinal,
  type EditorialEntry,
} from "./entries";
import {
  articleCategories,
  conferenceFormatLabel,
  interventionKindLabel,
  interventionKinds,
  interventionStatusLabel,
  programKindLabel,
  programStatusLabel,
} from "./taxonomy";

export interface Badge {
  label: string;
  tone?: "accent" | "muted";
}

export interface Detail {
  term: string;
  description: string;
  href?: string;
}

interface Filter {
  label: string;
  href: string;
  current?: boolean;
}

const list = (values: readonly string[]) => values.join(", ");

// --- Articles -------------------------------------------------------------

type Article = EditorialEntry<"articles">;

const authorNames = (article: Article) =>
  article.data.authors.map((author) =>
    author.role ? `${author.name} — ${author.role}` : author.name,
  );

export function articleMeta(article: Article): string[] {
  const authors = authorNames(article);
  return authors.length > 0 ? [`By ${list(authors)}`] : [];
}

export function articleDetails(article: Article): Detail[] {
  const details: Detail[] = [
    { term: "Published", description: formatDate(article.data.date) },
  ];

  const authors = authorNames(article);
  if (authors.length > 0) {
    details.push({
      term: authors.length === 1 ? "Author" : "Authors",
      description: list(authors),
    });
  }

  return details;
}

/**
 * Category chips for the blog. Only categories that have published articles are
 * offered, so no chip ever leads to an empty page.
 */
export function articleFilters(
  articles: Article[],
  current?: string,
): Filter[] {
  const used = new Set(articles.map((article) => article.data.category));

  return [
    {
      label: "All articles",
      href: `${editorialSections.articles.path}/`,
      current: current === undefined,
    },
    ...articleCategories
      .filter((category) => used.has(category.id))
      .map((category) => ({
        label: category.label,
        href: `${editorialSections.articles.path}/category/${category.id}/`,
        current: current === category.id,
      })),
  ];
}

// --- Press releases -------------------------------------------------------

type PressRelease = EditorialEntry<"pressReleases">;

export function pressReleaseMeta(release: PressRelease): string[] {
  const meta = [`Issued by ${list(release.data.issuedBy)}`];
  if (release.data.dateline) {
    meta.push(release.data.dateline);
  }
  return meta;
}

export function pressReleaseDetails(release: PressRelease): Detail[] {
  const details: Detail[] = [
    { term: "Released", description: formatDate(release.data.date) },
    { term: "Issued by", description: list(release.data.issuedBy) },
  ];

  if (release.data.dateline) {
    details.push({ term: "Dateline", description: release.data.dateline });
  }

  if (release.data.contactEmail) {
    details.push({
      term: "Press contact",
      description: release.data.contactEmail,
      href: `mailto:${release.data.contactEmail}`,
    });
  }

  return details;
}

// --- Interventions --------------------------------------------------------

type Intervention = EditorialEntry<"interventions">;

export const interventionBadge = (intervention: Intervention): Badge => ({
  label: interventionStatusLabel(intervention.data.status),
  tone: intervention.data.status === "ongoing" ? "accent" : "muted",
});

export const interventionEyebrow = (intervention: Intervention) =>
  `${interventionKindLabel(intervention.data.kind)} · ${formatDate(intervention.data.date)}`;

export function interventionMeta(intervention: Intervention): string[] {
  if (intervention.data.status !== "concluded") {
    return [];
  }
  return intervention.data.concludedDate
    ? [`Concluded ${formatDate(intervention.data.concludedDate)}`]
    : [];
}

export function interventionDetails(intervention: Intervention): Detail[] {
  const details: Detail[] = [
    {
      term: "Kind",
      description: interventionKindLabel(intervention.data.kind),
    },
    { term: "Started", description: formatDate(intervention.data.date) },
    {
      term: "Status",
      description: interventionStatusLabel(intervention.data.status),
    },
  ];

  if (intervention.data.concludedDate) {
    details.push({
      term: "Concluded",
      description: formatDate(intervention.data.concludedDate),
    });
  }

  return details;
}

/** Chips that narrow the interventions index by status, then by kind. */
export function interventionFilters(
  interventions: Intervention[],
  current?: string,
): Filter[] {
  const { path } = editorialSections.interventions;
  const usedKinds = new Set(interventions.map((entry) => entry.data.kind));

  return [
    {
      label: "All interventions",
      href: `${path}/`,
      current: current === undefined,
    },
    ...interventionKinds
      .filter((kind) => usedKinds.has(kind.id))
      .map((kind) => ({
        label: kind.label,
        href: `${path}/kind/${kind.id}/`,
        current: current === kind.id,
      })),
  ];
}

// --- Conferences ----------------------------------------------------------

type Conference = EditorialEntry<"conferences">;

export const conferenceBadge = (conference: Conference): Badge | undefined =>
  conference.data.edition
    ? { label: `${ordinal(conference.data.edition)} annual`, tone: "muted" }
    : undefined;

export function conferenceMeta(conference: Conference): string[] {
  const meta: string[] = [];
  if (conference.data.theme) {
    meta.push(`Theme: ${conference.data.theme}`);
  }
  if (conference.data.location) {
    meta.push(conference.data.location);
  }
  return meta;
}

export function conferenceDetails(conference: Conference): Detail[] {
  const details: Detail[] = [
    {
      term: "Date",
      description: formatDateRange(
        conference.data.date,
        conference.data.endDate,
      ),
    },
    {
      term: "Format",
      description: conferenceFormatLabel(conference.data.format),
    },
  ];

  if (conference.data.location) {
    details.push({ term: "Venue", description: conference.data.location });
  }

  if (conference.data.theme) {
    details.push({ term: "Theme", description: conference.data.theme });
  }

  if (conference.data.registrationUrl) {
    // Inviting registration to a conference that has already happened would be
    // misleading, so the same link is offered as an archive of the programme.
    const upcoming =
      (conference.data.endDate ?? conference.data.date).getTime() >= Date.now();

    details.push({
      term: upcoming ? "Registration" : "Programme",
      description: upcoming
        ? "Register and see full details"
        : "Full details and speakers",
      href: conference.data.registrationUrl,
    });
  }

  return details;
}

// --- Programs -------------------------------------------------------------

type Program = EditorialEntry<"programs">;

export const programBadge = (program: Program): Badge => ({
  label: programStatusLabel(program.data.status),
  tone: program.data.status === "scheduled" ? "accent" : "muted",
});

export const programEyebrow = (program: Program) =>
  `${programKindLabel(program.data.kind)} · ${formatDate(program.data.date)}`;

export function programMeta(program: Program): string[] {
  return [program.data.schedule, program.data.location].filter(
    (value): value is string => Boolean(value),
  );
}

export type ProgramPoster = Program["data"]["posters"][number];

export function programDetails(program: Program): Detail[] {
  const details: Detail[] = [
    {
      term:
        program.data.kind === "initiative" ? "Application deadline" : "Date",
      description: formatDate(program.data.date),
    },
    {
      term: "Status",
      description: programStatusLabel(program.data.status),
    },
  ];

  if (program.data.schedule) {
    details.push({ term: "Time", description: program.data.schedule });
  }

  if (program.data.location) {
    details.push({ term: "Location", description: program.data.location });
  }

  if (program.data.status === "scheduled" && program.data.registrationUrl) {
    details.push({
      term: "Registration",
      description: "Register to participate",
      href: program.data.registrationUrl,
    });
  }

  return details;
}
