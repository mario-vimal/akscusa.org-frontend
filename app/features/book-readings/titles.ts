/**
 * How a session names itself once it is listed under its book.
 *
 * Sessions are titled "The Will to Change: Chapters 1 – 4", because the title
 * has to stand alone on the session's own page and in a search result. Under
 * the book's entry the book has already been named, so repeating it three
 * times down one entry leaves a reader scanning past the same five words to
 * find the two that differ.
 *
 * Kept out of the presenters so the rule can be tested on plain strings.
 */

// Everything a title might put between the book and the part that follows it:
// a colon, a comma, or any of the dashes an editor might reach for.
const LEADING_SEPARATORS = /^[\s:,.\u2010-\u2015-]+/;

/**
 * What is left of a session's title once its book's title is taken off the
 * front, or nothing when the session is titled after the book alone. A session
 * with no label is shown by its date, which is the only thing that
 * distinguishes it.
 */
export function sessionLabel(
  title: string,
  bookTitle?: string,
  bookSubtitle?: string,
): string | undefined {
  const trimmed = title.trim();

  if (!bookTitle) {
    return trimmed || undefined;
  }

  const prefix = bookTitle.trim();
  // Case-insensitively, because "Why were Women enslaved?" is the same session
  // title as the book's "Why Were Women Enslaved?" as far as a reader is
  // concerned, and an editor should not have to match capitals to be understood.
  const named =
    trimmed.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase();

  if (!named) {
    return trimmed || undefined;
  }

  const rest = trimmed.slice(prefix.length).replace(LEADING_SEPARATORS, "");

  if (!rest) {
    return undefined;
  }

  /*
   * A session titled with the book's full name, subtitle and all — "Ambedkar:
   * Towards an Enlightened India" — has said nothing the entry above it has
   * not already said twice. The date alone tells that sitting apart.
   */
  if (
    bookSubtitle &&
    rest.toLowerCase() === bookSubtitle.trim().toLowerCase()
  ) {
    return undefined;
  }

  // A remainder that begins mid-sentence — ", continued" — reads as a fault
  // rather than as a label, so it is given its capital back.
  return rest[0].toUpperCase() + rest.slice(1);
}
