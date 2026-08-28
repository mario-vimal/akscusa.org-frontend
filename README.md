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
├── content.config.ts  # Schemas for both content sources
├── features/        # Components owned by each section
├── layouts/         # Base document and shared site chrome
└── pages/           # File-based routes
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
`app/content.config.ts` so missing fields fail the build. Contributors edit copy,
calls to action, and image descriptions without touching layouts. Structured
records live in `cms/content/` and are edited in the CMS instead.

When migrating existing AKSC pages, preserve the original copy. Do not
paraphrase or drop substantive assurances or calls to action without approval.

`MIGRATION-TRACKER.md` tracks every page on the two source sites
(`akscusa.org` and `akscusa.squarespace.com`) and what has moved so far. It is a
temporary working document; delete it once both sites are retired.

## Editorial collections

Six CMS collections share one base shape, defined once in
`app/content.config.ts` and reused by each: `title`, `date`, `summary`,
`topics`, `heroImage`, `sourceUrl`, `featured`, and `draft`. Each then adds only
the fields its own kind of entry needs.

| Collection      | Folder                       | Route             | Adds                                                      |
| --------------- | ---------------------------- | ----------------- | --------------------------------------------------------- |
| `articles`      | `cms/content/articles`       | `/blog`           | `category`, `authors`                                     |
| `pressReleases` | `cms/content/press-releases` | `/press-releases` | `dateline`, `issuedBy`, `contactEmail`, `attachments`     |
| `interventions` | `cms/content/interventions`  | `/interventions`  | `kind`, `status`, `concludedDate`, `outcome`, `resources` |
| `conferences`   | `cms/content/conferences`    | `/conferences`    | `edition`, `location`, `format`, speaker references       |
| `programs`      | `cms/content/programs`       | `/programs`       | `kind`, `status`, `schedule`, `location`, `posters`       |
| `bookReadings`  | `cms/content/book-readings`  | `/book-readings`  | `location`, `isbn`, `participants`, `registrationUrl`     |

`app/features/editorial/taxonomy.ts` is the single source of truth for every
controlled vocabulary: shared `topics`, article categories, intervention kinds
and statuses, conference formats, and program kinds and statuses.
`app/content.config.ts` turns those lists into Zod enums and the pages render
their labels. The CMS cannot import
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

### Books, linked by ISBN

`books` is another collection outside that base shape, because a book has no
publication date of its own here and never appears in a dated index. It lives in
`cms/content/books` and is served at `/books/` and `/books/<slug>/`.

One book usually carries several readings, so the metadata is stored once and
referenced. A reading names the edition it worked through in its `isbn` field,
the CMS offers that as a relation to the books collection, and
`app/features/books/queries/books.ts` resolves it at build time. Two checks keep
the link honest and fail the build rather than degrading quietly:

- an ISBN-13 must pass its check digit, so a typo cannot slip through
  (`app/features/books/isbn.ts`);
- a reading may not reference an ISBN that no book entry claims, and no two
  books may claim the same ISBN.

A book page lists every session that read it, and `/book-readings/` renders a
sortable, searchable table whose Book column links back to the book. A reading
whose book is only a draft renders without the book rather than failing the
build, so drafting a book cannot take the site down.

ISBNs are printed as bare digits. Where an ISBN-13 breaks into its registration
group and registrant depends on the ISBN range tables rather than fixed offsets,
so the site does not invent hyphenation; the table search accepts an ISBN typed
either way.

Cover art is fetched by ISBN and committed, so Astro optimizes it at build time
instead of the page depending on a third party at runtime:

```
npm run fetch:covers          # fetch any cover not already stored
node scripts/fetch-book-covers.mjs --force   # refetch everything
```

Covers land in `app/features/books/assets/covers/<isbn>.jpg`, are trimmed of the
flat padding Open Library adds to some images, and are matched to a book by
filename. A book with no cover file renders without one, so nothing breaks when
Open Library has nothing for an ISBN.

### Comics and toolkit scenarios, published as panels

`comics` and `toolkitScenarios` are the two drawn collections. Neither takes the
editorial base shape: a comic has no body copy, and a scenario is not dated at
all. Both are a titled sequence of panels, so they share one panel shape defined
once in `app/content.config.ts`.

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
| `npm run fetch:covers`   | Fetch missing book covers from Open Library   |
| `npm run deploy:pages`   | Deploy `dist` with the Pages command          |
| `npm run validate`       | Run all checks, build, and Pages verification |

## Sveltia CMS

Served at `/admin/` from `cms/public/admin/`. Collections cover the records in
`cms/content/`, each validated against a schema in `app/content.config.ts`.

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

## Figma

Figma MCP setup is deferred. Guidance for implementing supplied designs lives in
`.github/instructions/figma.instructions.md`. Add the Figma Dev Mode MCP server
with Copilot CLI's `/mcp add` flow when ready.
