# Repository conventions

## Visual system

- Use the Ambedkar blue scale in `app/styles/global.css` as the primary brand
  palette. Use saffron as a controlled accent, not as a competing primary.
- Use the self-hosted Cabin variable font through the global `font-sans` token.
- Consume named theme tokens in components; do not introduce isolated hex
  colors or untracked font declarations.

## Responsive design

- Design and implement mobile-first. Base styles must support small screens,
  then progressively enhance layouts at larger breakpoints.
- Treat mobile behavior as a required acceptance criterion for every page,
  component, and Figma implementation.
- Verify layouts at 320px, 375px, 768px, and a representative desktop width.
- Prevent horizontal overflow, preserve readable line lengths, and keep
  interactive targets comfortably usable by touch.
- Navigation and interactive controls must remain keyboard-accessible and
  understandable without relying on hover.

## Images

- Store feature-owned images in `app/features/<feature>/assets/`.
- Store reusable brand files in `app/assets/brand/` and other genuinely shared
  imagery in `app/assets/shared/`.
- Keep editorial media in Cloudflare R2 and reference its public URL from
  Sveltia-managed content rather than committing uploads to Git.
- Use `ResponsiveImage.astro` or Astro's image components for imported images so
  dimensions, responsive sources, and optimized formats are generated.
- Use lowercase kebab-case filenames and meaningful alternative text. Use an
  empty `alt` only when an image is entirely decorative.
- Keep `cms/` reserved for Sveltia CMS files that Astro serves unchanged. Put
  application assets under `app/assets/` so Astro can process them.

## Content

- Use Markdown content collections for static editorial pages that nontechnical
  contributors should be able to update.
- Preserve original wording and meaning when migrating content from an existing
  AKSC site. Do not rewrite, summarize, or omit substantive copy unless the user
  explicitly requests it or a minimal correction is required for accessibility
  or factual accuracy.
- Keep one-off page copy in `app/content/pages/`, mirroring route and feature
  names under `<feature>/index.md`. Keep presentation and accessibility
  behavior in Astro components.
- Put only repeating, structured records in `cms/content/`, where the CMS edits
  them. Do not add one-off page copy to a CMS collection.
- Give every page one authoritative source; do not duplicate it elsewhere.

## Data

- Store customer order records in Cloudflare D1. Do not use D1 for editorial
  content or expose order data through static content files.
- Access D1 only from server-side routes through a Cloudflare runtime binding.
- Keep payment credentials and customer data out of Git, client bundles, logs,
  and Sveltia CMS.
