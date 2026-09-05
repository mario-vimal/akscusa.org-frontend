/**
 * How this site writes a date.
 *
 * Every formatter is built once and reused, and every one of them names its
 * time zone. Dates are read as UTC unless the thing being described happens at
 * a particular hour in a particular place, which keeps a build reproducible
 * wherever it runs and stops a date shifting by a day for a reader in another
 * zone.
 */

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const formatDate = (date: Date): string => dayFormatter.format(date);
export const formatMonth = (date: Date): string => monthFormatter.format(date);

// A reading is scheduled at a time of day, not just on a date, and the circle
// keeps Pacific time wherever members join from.
const pacificDayFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "America/Los_Angeles",
});

const pacificTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
  timeZone: "America/Los_Angeles",
});

// A book the circle read over several sittings is listed once, so its entry
// states the run rather than a date: "June – October 2025". The month alone is
// formatted separately from the month and year, because a run inside one year
// should not print that year twice.
const pacificMonthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

// The same date with its year, for a book the circle came back to years later:
// under one entry spanning 2020 and 2025, "Apr 5" does not say which.
const pacificShortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Los_Angeles",
});

const pacificMonthOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "America/Los_Angeles",
});

const pacificYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: "America/Los_Angeles",
});

const pacificCalendarFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Los_Angeles",
});

export const formatPacificDate = (date: Date): string =>
  pacificDayFormatter.format(date);
export const formatPacificTime = (date: Date): string =>
  pacificTimeFormatter.format(date);
export const formatPacificMonthDay = (date: Date): string =>
  pacificMonthDayFormatter.format(date);
export const formatPacificShortDate = (date: Date): string =>
  pacificShortDateFormatter.format(date);

/**
 * The calendar year a session fell in where the circle meets. Taken from the
 * Pacific zone rather than from `getFullYear`, which answers in whatever zone
 * the build happened to run in: a session at 8 PM on 31 December in California
 * is already the next year in UTC, and the entry would be filed under a year
 * the circle never met in.
 */
export const pacificYear = (date: Date): number =>
  Number(pacificYearFormatter.format(date));

/**
 * The run of months a book was read over: "March 2025", "June – October 2025",
 * or "December 2019 – April 2020". A year is printed once when the run stays
 * inside it, because "June 2025 – October 2025" makes a reader compare two
 * numbers to learn they are the same.
 */
export function formatPacificMonthRange(start: Date, end: Date): string {
  const startYear = pacificYear(start);
  const endYear = pacificYear(end);
  const startMonth = pacificMonthOnlyFormatter.format(start);
  const endMonth = pacificMonthOnlyFormatter.format(end);

  if (startYear !== endYear) {
    return `${startMonth} ${startYear} \u2013 ${endMonth} ${endYear}`;
  }

  return startMonth === endMonth
    ? `${startMonth} ${endYear}`
    : `${startMonth} \u2013 ${endMonth} ${endYear}`;
}

/** ISO date without the time part, for a `<time datetime>` attribute. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * A reading's Pacific calendar day, not the UTC date of its timestamp. Parts
 * are assembled explicitly so locale punctuation cannot affect comparisons.
 */
export function isoPacificDate(date: Date): string {
  const parts = { year: "", month: "", day: "" };
  for (const { type, value } of pacificCalendarFormatter.formatToParts(date)) {
    if (type === "year" || type === "month" || type === "day") {
      parts[type] = value;
    }
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDateRange(start: Date, end?: Date): string {
  if (!end || isoDate(end) === isoDate(start)) {
    return formatDate(start);
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** "1st", "2nd", "3rd", "4th" — used for conference editions. */
export function ordinal(value: number): string {
  const remainderOfTen = value % 10;
  const remainderOfHundred = value % 100;
  if (remainderOfTen === 1 && remainderOfHundred !== 11) return `${value}st`;
  if (remainderOfTen === 2 && remainderOfHundred !== 12) return `${value}nd`;
  if (remainderOfTen === 3 && remainderOfHundred !== 13) return `${value}rd`;
  return `${value}th`;
}
