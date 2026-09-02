# TODO

Work that is agreed but not yet done. Delete a row once it ships.

## System pages

The site falls through to Astro's and Cloudflare's own error pages for
everything below, which carry neither the masthead, the helpline strip, nor the
footer. A reader who mistypes a URL or arrives from a dead inbound link is shown
a page that does not look like AKSC and offers them nowhere to go.

- [ ] **500 — Something went wrong.** Only reachable once a page renders on
      the server, which the site does not do yet. Add it with the first D1
      backed route, not before.

## Temporary links

- [ ] **Home hero: Annual Conference 2026.** The hero's secondary action in
      `app/content/pages/home/index.md` points off-site to
      `https://akscusa.squarespace.com/conf-26` for the duration of the
      migration, rather than at the migrated on-site route
      `/conferences/aksc-7th-annual-conference-2026/`. Point it back at the
      on-site route once the migration is complete, and delete this row. The
      spotlight band lower down the same page already links to the on-site
      conference, so the two disagree until this is undone.
      `MIGRATION-TRACKER.md` records the same dependency against `/conf-26`;
      neither that file nor the Squarespace site can be retired while this
      link is live.

## Notes

- Every system page above is static rendering, not a CMS collection: one page
  each, changing only when the design changes. Keep the copy in the component
  or in `app/content/pages/`, and do not model an error page as a collection
  entry.
- **No service worker, and so no offline page.** The site is static files on
  Cloudflare's edge. A worker would buy a cached copy of pages a reader has
  already visited, in exchange for a second cache to invalidate on every deploy
  and a class of bug where someone is served last month's helpline number.
  Revisit only if the site gains something an offline reader genuinely needs,
  such as a downloadable toolkit. This is recorded here so the question is not
  reopened every time someone notices there is no offline page.
- **No redirects for the retired WordPress and Squarespace URLs.** Decided
  against: it is one rule per old path, in both trailing-slash spellings,
  kept in step with `MIGRATION-TRACKER.md` by hand forever, to serve traffic
  that decays to nothing. The 404 page is the answer for those URLs. Reopen
  only if the logs show real people arriving on old paths in numbers worth the
  weight.
