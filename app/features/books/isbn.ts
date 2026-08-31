/**
 * ISBN-13 identifies the edition a book entry names, so it is normalized and
 * check-digit validated at build time. A typo in an ISBN is otherwise
 * invisible, and it would be caught by nothing else, since a reading names its
 * book by the book entry's stable id rather than by this field.
 */

/** Strips the spaces and hyphens people naturally type into an ISBN. */
export const normalizeIsbn = (value: string) => value.replace(/[\s-]/g, "");

export function isValidIsbn13(value: string) {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  // Digits alternate weights of 1 and 3, and the weighted sum is a multiple of
  // ten when the trailing check digit is right.
  const sum = [...value].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  );

  return sum % 10 === 0;
}

/**
 * The ISBN-10 that names the same edition, for the 978 prefix that was minted
 * by widening ISBN-10. Catalogues built before 2007 often hold a record only
 * under the older number, so a lookup that misses on the ISBN-13 is worth
 * retrying on this. A 979 ISBN never had an ISBN-10 form and returns nothing.
 */
export function isbn10FromIsbn13(value: string) {
  if (!isValidIsbn13(value) || !value.startsWith("978")) {
    return undefined;
  }

  const body = value.slice(3, 12);

  // ISBN-10 weights its nine digits 10 down to 2; the check digit makes the
  // weighted sum a multiple of eleven, and a remainder of ten is written "X".
  const sum = [...body].reduce(
    (total, digit, index) => total + Number(digit) * (10 - index),
    0,
  );
  const check = (11 - (sum % 11)) % 11;

  return `${body}${check === 10 ? "X" : check}`;
}

// Deliberately no hyphenating formatter. Where an ISBN-13 breaks into GS1
// prefix, registration group, registrant, and publication depends on the ISBN
// range tables, not on fixed offsets, so any split we invented here would print
// groupings that do not exist. The bare digits are always correct, and search
// still matches an ISBN typed with the hyphens from the back of a book.

/** Where a reader can look the book up beyond this site. */
export const openLibraryUrl = (isbn: string) =>
  `https://openlibrary.org/isbn/${normalizeIsbn(isbn)}`;
