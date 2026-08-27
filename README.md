# AKSC USA frontend

Astro frontend for [akscusa.org](https://akscusa.org), styled with Tailwind
CSS, backed by WordPress through WPGraphQL, and deployed to Cloudflare Pages.

The project starts with static site generation. The Cloudflare adapter
dependency is installed but remains disabled until selected routes move to
server rendering.

## Requirements

- Node.js 24 LTS (see `.nvmrc`)
- npm 11 or newer
- A WordPress site with WPGraphQL when CMS-backed routes are introduced

## Local setup

```sh
npm install
cp .env.example .env
npm run dev
```

`PUBLIC_WORDPRESS_GRAPHQL_URL` is public by design because requests may be made
during either static builds or client-side development. Never put WordPress
credentials in a `PUBLIC_` variable.

## Project structure

```text
src/
├── assets/            # Shared brand and cross-feature source images
├── components/
│   ├── navigation/  # Shared desktop and mobile navigation
│   └── ui/          # Reusable presentational components
├── config/          # Navigation and other site-wide configuration
├── content/         # Validated Markdown for repository-managed pages
├── features/        # Components and future queries owned by each section
├── layouts/         # Base document and shared site chrome
├── lib/             # WordPress and infrastructure clients
└── pages/           # File-based routes composed from feature components
```

Feature directories use lowercase kebab-case. Keep section-specific components
and WPGraphQL queries with their feature; move code into `components/ui` only
when it is genuinely shared. `SiteLayout.astro` owns the site header and footer,
while `config/navigation.ts` is the single source of truth for navbar links.
All UI work is mobile-first and must be verified at small, medium, and desktop
viewports.

## Visual system

The shared theme in `src/styles/global.css` uses Ambedkar blue as the primary
brand scale, saffron as an accent, and the self-hosted Cabin variable font.
Components consume named Tailwind tokens rather than defining one-off colors or
font families.

## Images

- Put section-specific source images in
  `src/features/<feature>/assets/`.
- Put reusable logos and brand artwork in `src/assets/brand/`; put other
  genuinely shared images in `src/assets/shared/`.
- Keep editorial images managed by WordPress in its media library and load them
  through WPGraphQL.
- Render imported images with `ResponsiveImage.astro` or Astro's image
  components to generate dimensions, responsive `srcset` values, and optimized
  output.
- Use lowercase kebab-case filenames and write useful alt text.
- Use `public/` only for files that require a stable, unprocessed URL.

## Markdown content

Repository-managed editorial pages live in `src/content/pages/`. Their
frontmatter is validated by `src/content.config.ts`, so missing required fields
fail the build instead of producing incomplete pages.

Home and Anti-Caste Helpline copy live in their matching
`src/content/pages/<feature>/index.md` files. Content mirrors the route/feature
hierarchy, using `index.md` for each Markdown-managed section's main page.
Contributors can edit copy, calls to action, contact details, and image
descriptions without changing Astro layouts. WordPress remains the source for
content that needs its editorial workflow or frequent publishing.

When migrating existing AKSC pages, preserve their original copy closely.
Substantive assurances, qualifications, and calls to action must not be
paraphrased or omitted without explicit approval.

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
| `npm run validate`       | Run all checks, tests, and a production build |

## WordPress

The typed client in `src/lib/wordpress.ts` validates the configured endpoint,
HTTP status, and GraphQL response before returning data. Keep query documents
and their response types near the feature that consumes them.

Static builds are the initial rendering policy. To introduce hybrid rendering,
change Astro's output to `server`, enable the installed Cloudflare adapter in
`astro.config.mjs`, and explicitly prerender routes that should remain static
with `export const prerender = true`.

## Cloudflare Pages

Production deployment uses Cloudflare Pages' native Git integration:

1. Connect `mario-vimal/akscusa.org-frontend` in the Cloudflare dashboard.
2. Set the production branch to `main`.
3. Use `npm run build` as the build command and `dist` as the output directory.
4. Set `NODE_VERSION` to `24.20.0`.
5. Add `PUBLIC_WORDPRESS_GRAPHQL_URL` when CMS-backed pages are enabled.

Pull requests from branches in this repository deploy previews through
`.github/workflows/cloudflare-preview.yml`. Configure these GitHub settings:

- Secret: `CLOUDFLARE_API_TOKEN`
- Secret: `CLOUDFLARE_ACCOUNT_ID`
- Variable: `CLOUDFLARE_PROJECT_NAME` (for example,
  `akscusa-org-frontend`)

Fork pull requests run validation but skip deployment so Cloudflare credentials
are never exposed to untrusted code.

## Figma

Figma MCP configuration is intentionally deferred. Repository guidance for
implementing supplied Figma designs lives in
`.github/instructions/figma.instructions.md`. Add the Figma Dev Mode MCP server
with Copilot CLI's `/mcp add` flow when the team is ready to authenticate it.
