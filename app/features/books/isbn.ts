/**
 * ISBN-13 is the key that links a reading to the book it worked through, so it
 * is normalized and check-digit validated at build time. A typo in an ISBN is
 * otherwise invisible: it would simply fail to resolve to a book.
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

// Deliberately no hyphenating formatter. Where an ISBN-13 breaks into GS1
// prefix, registration group, registrant, and publication depends on the ISBN
// range tables, not on fixed offsets, so any split we invented here would print
// groupings that do not exist. The bare digits are always correct, and search
// still matches an ISBN typed with the hyphens from the back of a book.

/** Where a reader can look the book up beyond this site. */
export const openLibraryUrl = (isbn: string) =>
  `https://openlibrary.org/isbn/${normalizeIsbn(isbn)}`;
