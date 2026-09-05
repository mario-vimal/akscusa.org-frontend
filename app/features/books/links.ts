/** Book URLs use stable entry IDs; an ISBN correction never moves a page. */
export const bookHref = (book: { id: string }): string => `/books/${book.id}/`;
