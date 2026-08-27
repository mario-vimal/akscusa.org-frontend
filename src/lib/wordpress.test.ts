import { describe, expect, it, vi } from "vitest";

import { createWordPressClient, WordPressGraphQLError } from "./wordpress";

const query = "query SiteTitle { generalSettings { title } }";

describe("createWordPressClient", () => {
  it("returns data from a successful GraphQL response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            generalSettings: {
              title: "AKSC USA",
            },
          },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    const request = createWordPressClient(
      "https://cms.example.com/graphql",
      fetcher,
    );

    const data = await request<{
      generalSettings: { title: string };
    }>({ query });

    expect(data.generalSettings.title).toBe("AKSC USA");
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://cms.example.com/graphql"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query }),
      }),
    );
  });

  it("surfaces GraphQL errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: "WordPress query failed." }],
        }),
        { status: 200 },
      ),
    );
    const request = createWordPressClient(
      "https://cms.example.com/graphql",
      fetcher,
    );

    await expect(request({ query })).rejects.toEqual(
      expect.objectContaining<Partial<WordPressGraphQLError>>({
        name: "WordPressGraphQLError",
        message: "WordPress query failed.",
      }),
    );
  });

  it("surfaces HTTP errors", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }));
    const request = createWordPressClient(
      "https://cms.example.com/graphql",
      fetcher,
    );

    await expect(request({ query })).rejects.toThrow(
      "WordPress GraphQL request failed with 503",
    );
  });

  it("rejects unsupported endpoint protocols", () => {
    expect(() => createWordPressClient("file:///tmp/graphql")).toThrow(
      "must use HTTP or HTTPS",
    );
  });
});
