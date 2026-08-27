export interface GraphQLErrorDetail {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLErrorDetail[];
}

export interface WordPressQuery<TVariables> {
  query: string;
  variables?: TVariables;
  signal?: AbortSignal;
}

export class WordPressGraphQLError extends Error {
  readonly errors: GraphQLErrorDetail[];

  constructor(errors: GraphQLErrorDetail[]) {
    super(errors.map(({ message }) => message).join("; "));
    this.name = "WordPressGraphQLError";
    this.errors = errors;
  }
}

function parseEndpoint(endpoint: string): URL {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("PUBLIC_WORDPRESS_GRAPHQL_URL must be a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("PUBLIC_WORDPRESS_GRAPHQL_URL must use HTTP or HTTPS.");
  }

  return url;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGraphQLError(value: unknown): value is GraphQLErrorDetail {
  return isRecord(value) && typeof value.message === "string";
}

function parseResponse<TData>(value: unknown): GraphQLResponse<TData> {
  if (!isRecord(value)) {
    throw new Error("WordPress returned an invalid GraphQL response.");
  }

  if ("errors" in value) {
    if (!Array.isArray(value.errors) || !value.errors.every(isGraphQLError)) {
      throw new Error("WordPress returned invalid GraphQL errors.");
    }
  }

  return value;
}

export function createWordPressClient(
  endpoint: string,
  fetcher: typeof fetch = fetch,
) {
  const url = parseEndpoint(endpoint);

  return async function queryWordPress<
    TData,
    TVariables extends Record<string, unknown> = Record<string, never>,
  >({ query, variables, signal }: WordPressQuery<TVariables>): Promise<TData> {
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `WordPress GraphQL request failed with ${response.status} ${response.statusText}.`,
      );
    }

    const payload = parseResponse<TData>(await response.json());

    if (payload.errors?.length) {
      throw new WordPressGraphQLError(payload.errors);
    }

    if (!("data" in payload)) {
      throw new Error("WordPress GraphQL response did not include data.");
    }

    return payload.data as TData;
  };
}

export function getWordPressClient() {
  const endpoint = import.meta.env.PUBLIC_WORDPRESS_GRAPHQL_URL;

  if (!endpoint) {
    throw new Error("PUBLIC_WORDPRESS_GRAPHQL_URL is not configured.");
  }

  return createWordPressClient(endpoint);
}
