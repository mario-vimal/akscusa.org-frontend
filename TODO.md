# TODO

Work that is agreed but not yet done. Delete a row once it ships.

Pre-launch remediation is tracked in [QUALITY-GATE.md](QUALITY-GATE.md), with
priorities, ordered subprojects, and release acceptance criteria.

## System pages

The site falls through to Astro's and Cloudflare's own error pages for
everything below, which carry neither the masthead, the helpline strip, nor the
footer. A reader who mistypes a URL or arrives from a dead inbound link is shown
a page that does not look like AKSC and offers them nowhere to go.

- [ ] **500 — Something went wrong.** Only reachable once a page renders on
      the server, which the site does not do yet. Add it with the first D1
      backed route, not before.

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
  maintained by hand to serve traffic that decays to nothing. The 404 page is
  the answer for those URLs. Reopen only if the logs show real people arriving
  on old paths in numbers worth the weight.
