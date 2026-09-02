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
- [ ] **Offline and asset failures.** Decide whether this site wants a service
      worker at all. If it does not, say so here so the question is not
      reopened every time someone notices there is no offline page.
- [ ] **Dead inbound links from the old sites.** `MIGRATION-TRACKER.md` lists
      the WordPress and Squarespace URLs. Anything not migrated to a matching
      path needs a redirect in a Cloudflare Pages `_redirects` file rather than
      a 404, because those URLs are still linked from elsewhere on the web.

## Author pages

- [ ] **An author has a page of their own.** `/authors/<slug>/`, listing every
      book of theirs the circle has read and the sessions that covered it. The
      relation is many-to-many in both directions: B. R. Ambedkar carries
      _Annihilation of Caste_, _Riddles in Hinduism_, and _Waiting for a Visa_,
      and an edited or co-written volume names more than one author. So an
      author cannot be a string on a book — it has to become its own collection
      that books reference by stable slug, the way a conference already
      references `speakers`. `app/schemas/books.ts` currently stores
      `authors: string[]`, which cannot survive two spellings of the same name
      and gives nothing to hang a biography, a portrait, or a byline link on.
      Until this ships, the author dropdown on `/book-readings/` filters on the
      exact stored string, which is the thing that breaks the first time a
      catalogue returns "Kancha Ilaiah" for one book and "Kancha Ilaiah
      Shepherd" for another.
- [ ] **Model authors as a collection** with a slug, a display name, and
      optional biography and portrait; migrate `books.authors` to slug
      references and fail the build on a reference no author claims, as
      conferences already do for speakers.
- [ ] **Teach the enrichment script to reuse an author.**
      `scripts/enrich-books.mjs` fills `authors` from Open Library, so it has to
      match an existing author entry before creating one, or every new book will
      mint a duplicate.
- [ ] **Decide whether an author with a single book gets a page at all**, and
      whether the byline on a book links to it. A page per author only earns its
      route once it lists more than the book you arrived from.

## Machine-readable routes

- [ ] **`robots.txt`** and **`sitemap.xml`**. `@astrojs/sitemap` is not
      installed and `site` is already set in `astro.config.mjs`, so this is one
      integration plus a `Sitemap:` line.

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
