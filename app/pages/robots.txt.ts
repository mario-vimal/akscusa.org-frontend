import type { APIRoute } from "astro";

// `site` is required by the sitemap integration, so it is always defined here;
// the endpoint derives both absolute URLs from it rather than repeating the
// domain, which is the pair that silently disagrees once one of them moves.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site);

  const body = [
    "User-agent: *",
    "Allow: /",
    // The CMS is a single-page app behind GitHub sign-in. It has nothing to
    // index and every path under it renders the same shell.
    "Disallow: /admin/",
    "",
    `Sitemap: ${sitemap.href}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
