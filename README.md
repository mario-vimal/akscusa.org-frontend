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
| A structural vocabulary                       | `features/editorial/taxonomy.ts`   |
| An editor-maintained vocabulary               | `cms/content/topics`, `categories` |
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

Vocabularies come from one of two places, depending on whether the site's code
depends on the terms.

The **structural** ones stay in `app/features/editorial/taxonomy.ts`:
intervention kinds and statuses, conference formats, program kinds and
statuses, and General Body paper kinds. A term there decides what a template
does — whether a concluded intervention prints a date range, which shelf a
program falls on — so adding one means writing the behaviour that goes with it.
`app/schemas/` turns those lists into Zod enums. The CMS cannot import
TypeScript, so `cms/public/admin/config.yml` repeats them as `select` options
and `scripts/cms/config.test.ts` fails if the two drift apart.

The **editorial** ones are content, in `cms/content/topics/` and
`cms/content/categories/`. Naming a new subject or a new blog shelf is
editorial judgement, not a code change, so an editor adds a term in the CMS and
every form that files an entry under one offers it immediately. Entries store a
term's filename and pick it through a relation widget, so a term can be renamed
without rewriting the entries that carry it and cannot be mistyped.
`app/features/editorial/queries/taxonomy.ts` is how a page reads them, and
`scripts/content/taxonomy.test.ts` catches an entry left pointing at a term
that no longer exists.

`topics` is shared across every collection, including books and comics, so an
article, a statement, a campaign, and a book about the same subject stay
relatable without duplicating an entry.

Each section has an index at its route and an entry page at
`<route>/<slug>/`. Book readings are listed as a record rather than as cards:
one entry per book, carrying the run of sittings it took and the flyers those
sittings were announced with. The blog and the interventions index narrow
themselves in place: the chips under the masthead filter the entries already on
the page and remember the choice in the query string, such as
`/blog/?category=books-and-media`, so a vocabulary an editor keeps adding to
never turns into a page per term. Only terms that entries actually use are
offered.
`app/features/editorial/` holds the shared list, card, and entry components, so
a change to one section's chrome lands on all six.

### Entry slugs

A slug is a filename in `cms/content/`, and Astro reads it as the `[slug]`
route parameter, so it is the entry's permanent web address.

Sveltia builds one from the collection's `slug` template when the entry is
first saved. `{{slug}}` is the slugified identifier field, which Sveltia
assumes is `title` unless the collection names another with
`identifier_field`. Authors and speakers are named by `name`, and topics and
categories by `label`; a collection that leaves this unsaid where it has no
`title` field gets a random UUID for a filename instead of a readable one, so
`scripts/cms/config.test.ts` fails if any collection's identifier field is
missing from its own `fields`.

No template dates a slug by `{{year}}-{{month}}-{{day}}`. Those tags are the
moment the entry is created, not any date it carries — Sveltia derives them
from a field only for a preview path — so a reading written up months after the
sitting, or a meeting minuted the following year, would be filed under the day
someone typed it. A General Body meeting reads its own date instead, as
`{{date | date('YYYY')}}`, and a reading is named by its title alone, which
already carries the chapter range or the "continued" that tells one sitting
from another. A test fails on the creation-date tags so they cannot come back.

The slug is not shown while an entry is being written, and renaming the title
afterwards does not rename the file. To read one back, look at the filename in
`cms/content/<collection>/`, at the last segment of the entry's URL, or at
**Edit Slug** in the entry editor's 3-dot menu, which is also how it is
changed. Renaming there is a Git rename, and Sveltia rewrites every relation
pointing at the entry — a book's authors, an article's topics — so no reference
is left dangling.

### List thumbnails

Sveltia puts a picture on a collection card by itself only when the collection
has an image field at the top level, and a book's cover is the only one on this
site. Every other picture hangs off an object or a list so that it can carry its
own alt text and credit, and the automatic search does not descend into either.
Those collections name the path themselves — `thumbnail: portrait.src` for an
author or a speaker, `thumbnail: panels.*.src` for a comic, where the `*` takes
the first entry the list holds. A test fails if a collection buries its images
and names nothing, because the symptom otherwise is a wall of blank cards that
looks like missing content rather than missing configuration.

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
sever every reading that names it. A book names its authors the same way, by
the slug of an entry in the authors collection. Three checks keep those links
honest and fail the build rather than degrading quietly:

- an ISBN-13, where a book has one, must pass its check digit, so a typo cannot
  slip through (`app/features/books/isbn.ts`), and no two books may claim the
  same ISBN;
- a reading may not reference a book slug that no book entry claims;
- a book may not reference an author slug that no author entry claims.

A book page lists every session that read it, and `/book-readings/` clubs those
sessions into one entry per book, which links back to it. A book worked through
over four Sundays is one entry naming its four sittings rather than four
entries, because a visitor scanning the page is asking what has been read. A
reading whose book is only a draft renders without the book rather than failing
the build, so drafting a book cannot take the site down.

A book identifies itself by its slug, not by its ISBN, so the ISBN is optional:
the circle reads pamphlets, PDFs of out-of-print texts, and editions older than
the scheme, and requiring a number would mean either keeping those out of the
catalogue or inventing one. A book without an ISBN prints no ISBN row and no
Open Library link; everything else about it works unchanged. Any number of books
may have none, since an absent ISBN is not a value two of them can share.

ISBNs are printed as bare digits. Where an ISBN-13 breaks into its registration
group and registrant depends on the ISBN range tables rather than fixed offsets,
so the site does not invent hyphenation; the reading log's search accepts an
ISBN typed either way.

A new book is entered as a complete record: title, authors, edition details, an
ISBN if the edition has one, and an AKSC-written summary. The filename is chosen
before publishing, because it is the book's permanent address and what every
reading links to. The cover belongs to the entry: it is
uploaded from the Books collection, committed under `cms/public/media/books/`,
and served from `/media/books/`. An optional `coverSource` names where the file
came from — the current set was taken from Open Library — and prints under the
picture; a book with none prints the generic caption instead, and a book with
no cover shows none. No external catalogue is contacted during a build.

Authors can upload portraits under `cms/public/media/authors/`, and book
readings can upload flyers under `cms/public/media/book-readings/`. These local
uploads are validated as media paths and remain available without R2.

### Authors, and the page each one gets

Authors live in `cms/content/authors/` with a name, optional other spellings, an
optional biography and portrait, and a `draft` flag. A book stores the slugs of
its authors, so the byline on every page is resolved from those entries rather
than read off the book, and an author is one record however many books they
carry. This is what the field could not do as a list of names: a catalogue
returning "Kancha Ilaiah" for one book and "Kancha Ilaiah Shepherd" for another
made one person into two, split their books between them, and gave the author
dropdown on `/book-readings/` two half-empty options. That dropdown now files an
entry under each author's slug, and the `aliases` field records the other
spellings so the CMS finds an existing author when a book is added.

Each author has a page at `/authors/<slug>/` listing every book of theirs the
circle has read, the sittings each book took, and their biography and portrait.
The route is generated only for an author at least one published book names —
an author entry nothing references has nothing to put on a page, and a byline is
the only way in.

**Every author gets a page, including an author of a single book.** The
alternative considered was a route that appears only once a second book of
theirs is read. It was rejected: it makes a published address depend on how much
of a person's work the circle has happened to get through, so a link breaks when
a book is drafted, and a byline would have to be clickable for some names and
not others with nothing on the page to explain which. A one-book page still
carries the biography and the portrait, which no book page shows.

There is no `/authors/` index. The books index and the reading log are already
lists of the same reading, and a second list of it ordered by author would be a
page duplicating what those two say.

Portraits belong to the author entry. Its `portrait` is an image the editor
uploads, committed under `cms/public/media/authors/`, and its optional `credit`
records the photographer, the licence, and the source page, which the site
prints under the picture. The credit is what lets a borrowed photograph be
published at all: a CC BY-SA portrait needs its attribution shown, and an
editor who can upload the picture can therefore also supply what must be said
about it. A photograph AKSC holds needs no credit and prints none. An author
with no portrait shows no picture — the page opens on a name rather than a
face.

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

## Figma

Figma MCP setup is deferred. Guidance for implementing supplied designs lives in
`.github/instructions/figma.instructions.md`. Add the Figma Dev Mode MCP server
with Copilot CLI's `/mcp add` flow when ready.
