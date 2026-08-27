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

`app/styles/global.css` defines Ambedkar blue as the primary scale, saffron as
an accent, and the self-hosted Cabin variable font. Use named Tailwind tokens
rather than one-off colors or font families.

## Images

- Section images: `app/features/<feature>/assets/`.
- Brand artwork: `app/assets/brand/`; other shared images: `app/assets/shared/`.
- Editorial media lives in R2; store its public URL in CMS content.
- Render imports through `ResponsiveImage.astro` or Astro's image components so
  dimensions, `srcset`, and optimized formats are generated.
- Lowercase kebab-case filenames and useful alt text.

## Markdown content

One-off page copy lives in `app/content/pages/<feature>/index.md`, validated by
`app/content.config.ts` so missing fields fail the build. Contributors edit copy,
calls to action, and image descriptions without touching layouts. Structured
records live in `cms/content/` and are edited in the CMS instead.

When migrating existing AKSC pages, preserve the original copy. Do not
paraphrase or drop substantive assurances or calls to action without approval.

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
`cms/content/`, each validated against a schema in `app/content.config.ts`.

The GitHub backend supports token sign-in immediately. Before giving
nontechnical editors access, deploy
[Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) and set
its URL as `backend.base_url`.

### Review workflow

`publish_mode: editorial_workflow` keeps editors off `main`. Saving an entry
creates branch `cms/<collection>/<slug>` and opens a draft pull request, titled
from `backend.commit_messages`. Entries carry a label per stage:

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

Pull requests deploy previews through `.github/workflows/cloudflare-preview.yml`,
which needs secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, plus the
variable `CLOUDFLARE_PROJECT_NAME`. Fork pull requests run validation but skip
deployment, so credentials are never exposed to untrusted code.

## Figma

Figma MCP setup is deferred. Guidance for implementing supplied designs lives in
`.github/instructions/figma.instructions.md`. Add the Figma Dev Mode MCP server
with Copilot CLI's `/mcp add` flow when ready.
