# TODO

Work that is agreed but not yet done. Delete a row once it ships.

## System pages

The site currently falls through to Astro's and Cloudflare's own error pages,
which carry neither the masthead, the helpline strip, nor the footer. A reader
who mistypes a URL or arrives from a dead inbound link is shown a page that
does not look like AKSC and offers them nowhere to go.

- [ ] **404 — Not found.** `app/pages/404.astro`, rendered in `SiteLayout` so
      the header, helpline strip, and footer are all present. Say plainly that
      the page is gone or was never there, and route the reader on: the
      sections under Actions, the blog, and the search their browser did not
      give them. Cloudflare Pages serves `dist/404.html` automatically for a
      static build, so no route configuration is needed.
- [ ] **500 — Something went wrong.** Only reachable once a page renders on
      the server, which the site does not do yet. Add it with the first D1
      backed route, not before.
- [ ] **Offline and asset failures.** Decide whether this site wants a service
      worker at all. If it does not, say so here so the question is not
      reopened every time someone notices there is no offline page.
- [ ] **Dead inbound links from the old sites.** `MIGRATION-TRACKER.md` lists
      the WordPress and Squarespace URLs. Anything not migrated to a matching
      path needs a redirect in a Cloudflare Pages `_redirects` file rather than
      a 404, because those URLs are still linked from elsewhere on the web.

## Machine-readable routes

- [ ] **`robots.txt`** and **`sitemap.xml`**. `@astrojs/sitemap` is not
      installed and `site` is already set in `astro.config.mjs`, so this is one
      integration plus a `Sitemap:` line.

## Notes

- Every one of these is static rendering, not a CMS collection: one page each,
  changing only when the design changes. Keep the copy in the component or in
  `app/content/pages/`, and do not model an error page as a collection entry.
