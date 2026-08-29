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

export const formatPacificDate = (date: Date): string =>
  pacificDayFormatter.format(date);
export const formatPacificTime = (date: Date): string =>
  pacificTimeFormatter.format(date);

/** ISO date without the time part, for a `<time datetime>` attribute. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

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
