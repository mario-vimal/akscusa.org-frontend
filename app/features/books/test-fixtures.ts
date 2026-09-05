import type { Author } from "~/features/authors/queries/authors";
import type {
  Book,
  BookWithAuthors,
  Reading,
} from "~/features/books/queries/books";

// Complete schema-shaped fixtures keep presenter tests independent of Astro's
// content loader while still letting type checking catch changes to that shape.
export const author = (
  id: string,
  data: Partial<Author["data"]> = {},
): Author => ({
  id,
  collection: "authors",
  data: { name: id, aliases: [], draft: false, ...data },
});

export const book = (
  id: string,
  data: Partial<Book["data"]> = {},
  authors: Author[] = [],
): BookWithAuthors => ({
  book: {
    id,
    collection: "books",
    data: {
      title: id,
      authors: authors.map((entry) => entry.id),
      topics: [],
      resources: [],
      draft: false,
      ...data,
    },
  },
  authors,
});

export const reading = (
  id: string,
  date: string,
  data: Partial<Reading["data"]> = {},
): Reading => ({
  id,
  collection: "bookReadings",
  data: {
    title: id,
    summary: "A reading and discussion.",
    date: new Date(date),
    location: "San Jose",
    participants: [],
    resources: [],
    posters: [],
    topics: [],
    featured: false,
    draft: false,
    ...data,
  },
});
