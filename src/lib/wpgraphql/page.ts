export interface WordPressPageData {
  page: {
    databaseId: number;
    title: string;
    content: string | null;
    modified: string;
  } | null;
}

export const pageByUriQuery = `
  query PageByUri($uri: ID!) {
    page(id: $uri, idType: URI) {
      databaseId
      title
      content
      modified
    }
  }
`;

export function createPageQuery(uri: `/${string}`) {
  return {
    query: pageByUriQuery,
    variables: { uri },
  } as const;
}
