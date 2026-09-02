# AKSC USA frontend

Astro site for [akscusa.org](https://akscusa.org), styled with Tailwind CSS,
edited through Sveltia CMS, and deployed to Cloudflare Pages. Media goes to
Cloudflare R2; customer orders will go to Cloudflare D1.

Output is static. The Cloudflare adapter is installed but stays disabled until
some routes need server rendering.

## Requirements

- Node.js 24 LTS (see `.nvmrc`)
- npm 11 or newer

## Local setup

```sh
npm install
npm run dev
```

Site at `http://localhost:4321`, CMS at `http://localhost:4321/admin/`.

## Project structure

```text
app/                 # Code and one-off page copy, maintained in Git
├── assets/          # Brand and cross-feature source images
├── components/      # `navigation/` and reusable `ui/`
├── config/          # Navigation and site-wide configuration
├── content/pages/   # Copy for one-off pages, edited by developers
├── content.config.ts  # Lists the collections; the schemas are in `schemas/`
├── features/        # One directory per section of the site
├── layouts/         # Base document and shared site chrome
├── lib/             # Cross-feature helpers that belong to no one section
├── pages/           # File-based routes
└── schemas/         # Content collection definitions, one file per domain
cms/                 # Everything the CMS owns
├── content/         # Structured records, read by Astro, never served
└── public/          # Astro `publicDir`, served verbatim
    ├── admin/       # Sveltia CMS application and content model
    └── media/       # CMS uploads, published at `/media/`
scripts/             # Build tooling, never shipped
└── cms/             # Backend repository and dev routing for `/admin/`
```

`cms/content/` holds repeating, structured records that benefit from a form and
a nontechnical editor. One-off page copy stays in `app/content/pages/` and is
reviewed like code. A test fails if a CMS collection points into `app/`.

Only `cms/public/` is the `publicDir`, so the Sveltia admin is served as a
static file while editorial Markdown stays build input. Build tooling belongs in
`scripts/`, never in `cms/`, where everything is published.

Feature directories use lowercase kebab-case; keep section-specific components
with their feature. `config/navigation.ts` is the single source of truth for
navbar links. All UI is mobile-first and verified at small, medium, and desktop
widths.

## Code conventions

These exist so that the answer to "where does this go?" is the same whoever is
asking, and so a file can be understood without reading the ten around it.

### Imports

`~/` resolves to `app/`. Use it for anything outside the current directory:

```ts
import Container from "~/components/ui/Container.astro";
import { loadEditorialEntries } from "~/features/editorial/queries/entries";
import { formatDate } from "~/lib/dates";
```

Siblings keep a relative path (`./EntryCard.astro`), because a sibling import
says "this belongs with me" and survives the directory being moved. There are no
`../` imports; if you find yourself writing one, use the alias.

### Where things go

| Kind of code                                  | Goes in                            |
| --------------------------------------------- | ---------------------------------- |
| Reads a content collection                    | `features/<feature>/queries/`      |
| Turns an entry into the strings a page prints | `features/<feature>/presenters.ts` |
| A controlled vocabulary                       | `features/editorial/taxonomy.ts`   |
| Pure helper, no content access                | `features/<feature>/<name>.ts`     |
| Useful to more than one feature               | `app/lib/`                         |
| A collection's schema                         | `app/schemas/<domain>.ts`          |
| Markup for one section                        | `features/<feature>/components/`   |
| Markup reused across sections                 | `app/components/ui/`               |

A route in `app/pages/` should read as a list of sections. If its frontmatter is
filtering, grouping, joining, or reducing, that work belongs in the feature's
`queries/` module and the page should call one function.

### Modules worth knowing

- `app/lib/collections.ts` — what counts as published and what order entries
  come back in. `loadPublished(collection, compare)` is how a collection is
  read; the comparator is required so a list's order is stated where the list is
  loaded. Never re-implement the draft rule.
- `app/lib/dates.ts` — every date format the site uses. Dates are read as UTC
  unless the thing happens at an hour in a place, which is why a reading uses
  the Pacific formatters and an article does not.
- `app/features/editorial/sections.ts` — the six editorial sections, their
  routes, and their titles. `entryHref` builds every editorial link.
- `app/schemas/shared.ts` — schema fragments used by more than one collection,
  including `editorialBase`, the shape those six sections share.

### Components

Props are typed with a `Props` interface, and a component takes a view model
rather than a raw `CollectionEntry` wherever one exists, so a schema change
cannot quietly reshape a page. A view-model type is exported from the module
that builds it, not declared in the component that receives it.

Anything more than a few lines of browser JavaScript moves out of `<script>`
into a `.ts` module the script imports, so it is type-checked, linted, and
readable on its own:

```astro
<script>
  import { mountCarousels } from "~/features/home/carousel";

  mountCarousels();
</script>
```

Comments explain why, not what. A comment that restates the code is noise; one
that records a constraint, a rejected alternative, or a browser behaviour that
forced the shape of the code is the reason the file is maintainable.

## Visual system

`app/styles/global.css` defines Ambedkar blue as the primary scale, a teal
`accent` as a controlled secondary, and a crimson `alert` reserved for urgency.
Type is a three-role system of self-hosted variable fonts: Archivo for headings
and labels (`font-display`), Instrument Sans for interface text (`font-sans`),
and Newsreader for long-form reading (`font-serif`). Structure is drawn with
hairline rules rather than shadows: the one line with weight is the 2px accent
rule that draws itself in on scroll, carried by `section-head` or on its own as
`rule-draw`. Use named Tailwind tokens rather than one-off colors or font
families.

## Images

- Section images: `app/features/<feature>/assets/`.
- Brand artwork: `app/assets/brand/`; other shared images: `app/assets/shared/`.
- Editorial media lives in R2; store its public URL in CMS content.
- Render imports through `ResponsiveImage.astro` or Astro's image components so
  dimensions, `srcset`, and optimized formats are generated.
- Posters and flyers go through `Poster.astro`, which sizes the figure to the
  artwork and enlarges it in an in-page `<dialog>` rather than a new tab.
- Lowercase kebab-case filenames and useful alt text.

## Markdown content

One-off page copy lives in `app/content/pages/<feature>/index.md`, validated by
`app/schemas/pages.ts` so missing fields fail the build. Contributors edit copy,
calls to action, and image descriptions without touching layouts. Structured
records live in `cms/content/` and are edited in the CMS instead.

When migrating existing AKSC pages, preserve the original copy. Do not
paraphrase or drop substantive assurances or calls to action without approval.

`MIGRATION-TRACKER.md` tracks every page on the two source sites
(`akscusa.org` and `akscusa.squarespace.com`) and what has moved so far. It is a
temporary working document; delete it once both sites are retired.

## Editorial collections

Six CMS collections share one base shape, defined once as `editorialBase` in
`app/schemas/shared.ts` and reused by each: `title`, `date`, `summary`,
`topics`, `heroImage`, `sourceUrl`, `featured`, and `draft`. Each then adds only
the fields its own kind of entry needs.

| Collection      | Folder                       | Route             | Adds                                                      |
| --------------- | ---------------------------- | ----------------- | --------------------------------------------------------- |
| `articles`      | `cms/content/articles`       | `/blog`           | `category`, `authors`                                     |
| `pressReleases` | `cms/content/press-releases` | `/press-releases` | `dateline`, `issuedBy`, `contactEmail`, `attachments`     |
| `interventions` | `cms/content/interventions`  | `/interventions`  | `kind`, `status`, `concludedDate`, `outcome`, `resources` |
| `conferences`   | `cms/content/conferences`    | `/conferences`    | `edition`, `location`, `format`, speaker references       |
| `programs`      | `cms/content/programs`       | `/programs`       | `kind`, `status`, `schedule`, `location`, `posters`       |
| `bookReadings`  | `cms/content/book-readings`  | `/book-readings`  | `location`, `book`, `participants`, `registrationUrl`     |

`app/features/editorial/taxonomy.ts` is the single source of truth for every
controlled vocabulary: shared `topics`, article categories, intervention kinds
and statuses, conference formats, and program kinds and statuses.
`app/schemas/` turns those lists into Zod enums and the pages render their
labels. The CMS cannot import
TypeScript, so `cms/public/admin/config.yml` repeats the options in YAML and
`scripts/cms/config.test.ts` fails if the two drift apart.

`topics` is shared across all six collections, so an article, a statement, and
a campaign about the same subject stay relatable without duplicating an entry.

Each section has an index at its route and an entry page at
`<route>/<slug>/`. Book readings are listed as a sortable table rather than
cards, since the archive grows steadily. Articles are also browsable by category at
`/blog/category/<category>/` and interventions by kind at
`/interventions/kind/<kind>/`; only terms that have entries get a page.
`app/features/editorial/` holds the shared list, card, and entry components, so
a change to one section's chrome lands on all six.

Entries marked `draft` are visible in `npm run dev` and left out of the build.

### Speakers, shared across conferences

Speaker biographies live once in `cms/content/speakers/` and have no standalone
route. A conference stores an ordered list of stable speaker slugs; its page
resolves and presents those biographies in the conference context. Missing,
draft, or misspelled references fail the build rather than silently dropping a
speaker. Portraits are optional R2 URLs, so the same biography and image can be
reused by future conferences without copying either.

### Books, linked by stable id

`books` is another collection outside that base shape, because a book has no
publication date of its own here and never appears in a dated index. It lives in
`cms/content/books` and is served at `/books/` and `/books/<slug>/`.

One book usually carries several readings, so the metadata is stored once and
referenced. A reading names the book it worked through in its `book` field, by
the book entry's stable content id (its slug) rather than its ISBN, the CMS
offers that as a relation to the books collection, and
`app/features/books/queries/books.ts` resolves it at build time. Referencing
the slug rather than the ISBN means correcting a book's ISBN afterwards cannot
sever every reading that names it. Two checks keep the link honest and fail
the build rather than degrading quietly:

- an ISBN-13 must pass its check digit, so a typo cannot slip through
  (`app/features/books/isbn.ts`), and no two books may claim the same ISBN;
- a reading may not reference a book slug that no book entry claims.

A book page lists every session that read it, and `/book-readings/` renders a
sortable, searchable table whose Book column links back to the book. A reading
whose book is only a draft renders without the book rather than failing the
build, so drafting a book cannot take the site down.

ISBNs are printed as bare digits. Where an ISBN-13 breaks into its registration
group and registrant depends on the ISBN range tables rather than fixed offsets,
so the site does not invent hyphenation; the table search accepts an ISBN typed
either way.

A new book only needs its ISBN. The title and the rest of the edition — cover
art, subtitle, authors, publisher, edition year, first publication year — are
looked up from the ISBN on Open Library and committed, so Astro optimizes the
cover at build time instead of the page depending on a third party at runtime.
An entry saved with no title is also renamed to the file that title names, so
it reaches a readable URL rather than keeping the random id the CMS gives a
file it has no title to name. Typing the title yourself is how you choose that
URL, and it is the only reason to:

```
npm run enrich:books                        # fill in every blank field and missing cover
node scripts/enrich-books.mjs --force       # refetch every cover
node scripts/enrich-books.mjs --covers-only # covers only, leaving frontmatter alone
```

`.github/workflows/enrich-books.yml` runs this on the pull request Sveltia opens
for a book and commits what it finds, so an editor who knows only the ISBN still
gets a complete entry. The build itself never calls Open Library.

Only an entry that had no title of its own is renamed: the filename is the
entry's id, so a title an editor typed chose that id and a catalogue does not
overrule it later. The rename is refused, and reported, when another book
already has that filename or a reading already names this entry, because a
tidier URL is not worth breaking the link between a reading and its book. A
book that reaches the build with no title fails it rather than publishing an
empty heading, which is the case where Open Library had no record at all.

A fetched value only ever fills a blank field; nothing an editor typed is
replaced. `isbn` is the question being asked, `topics`, `resources`, and `draft`
are editorial judgement, and `summary` is deliberately never fetched: a
catalogue summary is the publisher's marketing copy, which is both the wrong
voice for this site and not ours to copy. The summary is optional for the same
reason — an entry saved from its ISBN alone is written up in AKSC's own words
afterwards, rather than an editor filling a required field with a blurb. A
free-text publication date yields a year only when it names exactly one, so a
reprint cannot come to claim it was written the year it was reprinted.

A book that names no authors and a book with no summary yet both render: the
byline and the summary paragraph are printed only when there is one, and the
page's meta description falls back to the book and its authors.

Covers land in `app/features/books/assets/covers/<isbn>.jpg`, are trimmed of the
flat padding Open Library adds to some images, and are matched to a book by
filename. A book with no cover file renders without one, so nothing breaks when
Open Library has nothing for an ISBN; the run lists those books rather than
failing. A cover already on disk is never refetched, so one committed by hand
stands.

### Comics and toolkit scenarios, published as panels

`comics` and `toolkitScenarios` are the two drawn collections. Neither takes the
editorial base shape: a comic has no body copy, and a scenario is not dated at
all. Both are a titled sequence of panels, so they share one panel shape defined
once in `app/schemas/artwork.ts`.

| Collection         | Folder                          | Route                 | Ordered by              |
| ------------------ | ------------------------------- | --------------------- | ----------------------- |
| `comics`           | `cms/content/comics`            | `/comics`             | `date`, newest first    |
| `toolkitScenarios` | `cms/content/toolkit-scenarios` | `/anti-caste-toolkit` | `order`, counted from 1 |

A scenario is ordered by hand rather than by date, because a playbook is read in
the sequence its authors chose. Scenarios have no route of their own: a four
panel scene is not worth a click, so they are sections of the toolkit page.

Every panel carries **two** descriptions, and they are not interchangeable:

- `alt` describes the drawing — who is in it, where they are, what they are
  doing.
- `transcript` is every word drawn inside the panel, in reading order, one line
  per bubble, with `Speaker: line` naming who is talking.

A comic bakes its argument into a picture. Without a transcript none of that
argument reaches a screen reader, a translation, or a search result; and
repeating the lettering inside `alt` would have a screen reader announce it
twice. `app/features/artwork/` holds the shared panel machinery: the transcript
parser, the build-time size reader, and `PanelSequence.astro`, which renders a
sequence with numbered anchors, per-panel transcripts, and a full-screen viewer
with keyboard paging. Transcripts are `details` elements and work with no
JavaScript; the viewer's controls stay hidden until the script that gives them
meaning has run.

Panels are committed under `cms/public/media/comics/` and
`cms/public/media/anti-caste-toolkit/` and served from `/media/`, so a published
comic is a file this site serves. Astro never sees them as an import and so
cannot supply their dimensions, which `app/features/artwork/panels.ts` reads off
each committed file at build time; a page of 37 images would otherwise reflow as
each one arrives.

`scripts/content/artwork.test.ts` fails the build on a panel with no
description, on a panel that is referenced but not committed, on an uploaded
panel that nothing references, and on a comic with no credit. Publishing other
artists' work is the point of the collection, so an uncredited comic is a bug.

`cms/content/` is in `.prettierignore`. Sveltia writes those files when an
editor saves, and it does not format them the way Prettier would, so checking
them would fail every pull request the CMS opens.

## Commands

| Command                  | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `npm run dev`            | Start Astro at `http://localhost:4321`        |
| `npm run build`          | Build the static site into `dist/`            |
| `npm run preview`        | Preview the production build locally          |
| `npm run check`          | Run Astro and TypeScript diagnostics          |
| `npm run lint`           | Run ESLint                                    |
| `npm run format`         | Format supported files                        |
| `npm run format:check`   | Verify formatting                             |
| `npm test`               | Run Vitest once                               |
| `npm run generate-types` | Generate Cloudflare runtime binding types     |
| `npm run verify:pages`   | Smoke-test `dist` through Wrangler Pages      |
| `npm run enrich:books`   | Fetch book covers and details by ISBN         |
| `npm run fetch:covers`   | Fetch missing book covers only                |
| `npm run deploy:pages`   | Deploy `dist` with the Pages command          |
| `npm run validate`       | Run all checks, build, and Pages verification |

## Sveltia CMS

Served at `/admin/` from `cms/public/admin/`. Collections cover the records in
`cms/content/`, each validated against a schema in `app/schemas/`.

The GitHub backend supports token sign-in immediately. Before giving
nontechnical editors access, deploy
[Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) and set
its URL as `backend.base_url`.

### Review workflow

`publish_mode: editorial_workflow` keeps editors off `main`. Saving an entry
creates branch `cms/<collection>/<slug>` and opens a **draft** pull request,
titled from `backend.commit_messages`. One entry means one pull request, however
many times it is saved. Draft requests do not run CI; validation starts when the
entry moves to In Review. Entries carry a label per stage:

| Stage     | Label                         |
| --------- | ----------------------------- |
| Draft     | `sveltia-cms/draft`           |
| In Review | `sveltia-cms/pending_review`  |
| Ready     | `sveltia-cms/pending_publish` |

Publishing merges and deletes the branch; discarding closes it. Deleting a
published entry also goes through a pull request. `squash_merges: true` collapses
intermediate saves into one commit.

Add `publish: false` to a collection to stop editors merging their own work.
Branch protection on `main` enforces this at the Git level.

**Token permissions.** Signing in with a token needs more than write access. A
classic token with the `repo` scope covers everything; the sign-in dialog links
to a pre-filled page for one. A fine-grained token needs, for this repository:

| Permission    | Level          | Used for                     |
| ------------- | -------------- | ---------------------------- |
| Contents      | Read and write | Branches and commits         |
| Pull requests | Read and write | Opening and merging requests |
| Issues        | Read and write | Stage labels                 |
| Metadata      | Read           | Required by GitHub           |

Missing Pull requests permission fails with `Resource not accessible by personal
access token` _after_ the branch and commits are created, leaving a `cms/`
branch with no pull request. Fix the token and save again; delete the stray
branch if a duplicate is opened.

### Backend repository

`cms/public/admin/config.yml` ships the placeholder `OWNER/REPOSITORY`. The
backend commits to whatever that names, from a local dev server just as readily
as from the deployed site, so keeping it inert means local testing cannot reach
the live site. A test enforces it.

`CMS_REPO` names the real repository. It applies to `astro build` and the dev
server, and is read from the shell and `.env`.

- Cloudflare Pages: set it in the build command under Settings > Build.

  ```sh
  CMS_REPO=akscsfba/akscusa.org-frontend npm run build
  ```

- GitHub Actions previews: `gh variable set CMS_REPO --body <owner>/<repo>`.

Locally, prefer **Work with Local Repository** on the sign-in screen: it writes
to your working copy only and needs no repository setting, but requires a
Chromium-based browser. To test GitHub sign-in, point `CMS_REPO` at your fork:

```sh
cp .env.example .env
```

### R2 media

1. Create the `akscusa-media` bucket and attach `media.akscusa.org` as its
   public custom domain.
2. Create a bucket-scoped token with **Object Read & Write**.
3. Add `media_libraries` to `cms/public/admin/config.yml`. Never commit the
   Secret Access Key; Sveltia asks each editor for it, and a test fails if one
   is committed.

   ```yaml
   media_libraries:
     cloudflare_r2:
       access_key_id: your-access-key-id
       account_id: your-cloudflare-account-id
       bucket: akscusa-media
       public_url: https://media.akscusa.org
   ```

4. Allow the production and preview origins in the bucket's CORS policy for
   `GET`, `PUT`, and `HEAD`.

## Customer orders

Cloudflare D1 is the system of record. The order flow is not implemented, so no
schema or binding is created speculatively. When work starts:

1. `npx wrangler d1 create akscusa-customer-orders`.
2. Uncomment and complete the `ORDERS_DB` binding in `wrangler.jsonc`.
3. Add versioned SQL migrations before any order routes.
4. Move those routes to Cloudflare server rendering, keeping editorial pages
   prerendered.

Order writes must run server-side. Never put customer details, payment
credentials, or order records in Markdown, R2, client bundles, or logs.

## Cloudflare Pages

Production uses Pages' native Git integration:

1. Connect the repository and set the production branch to `main`.
2. Build command `CMS_REPO=<owner>/<repo> npm run build`, output directory
   `dist`.
3. Leave the deploy command empty. If your build flow requires one, use
   `npm run deploy:pages`; never `wrangler deploy`, which targets Workers.
4. Set `NODE_VERSION` to `24.20.0`.

If a newly added variable seems missing, the deployment may have reused a cached
build; clear the build cache under Settings > Build and retry.

For `npm run deploy:pages`, create an API token with **Account > Cloudflare
Pages > Edit**, scoped to the account owning the project, and set it as
`CLOUDFLARE_API_TOKEN`. A user's account role does not widen an under-scoped
token.

Pull request previews come from the same Git integration, so no deployment
workflow is needed. `.github/workflows/validate.yml` only runs `npm run
validate`, and skips draft pull requests: the CMS opens one per saved entry, and
validation waits until the entry leaves Draft and the request is marked ready
for review. Set the `CMS_REPO` repository variable so that build matches the
deployed one.

The one other workflow is `.github/workflows/enrich-books.yml`, which fills in a
new book's title, cover and bibliographic details from its ISBN and commits them
to the branch. It is the only workflow with write access, and it refuses to run
on a pull request from a fork.

## Figma

Figma MCP setup is deferred. Guidance for implementing supplied designs lives in
`.github/instructions/figma.instructions.md`. Add the Figma Dev Mode MCP server
with Copilot CLI's `/mcp add` flow when ready.
