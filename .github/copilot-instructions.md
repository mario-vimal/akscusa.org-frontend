# Repository conventions

## Visual system

- Use the Ambedkar blue scale in `src/styles/global.css` as the primary brand
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

- Store feature-owned images in `src/features/<feature>/assets/`.
- Store reusable brand files in `src/assets/brand/` and other genuinely shared
  imagery in `src/assets/shared/`.
- Keep WordPress editorial images in the WordPress media library and reference
  them through WPGraphQL rather than duplicating them in Git.
- Use `ResponsiveImage.astro` or Astro's image components for imported images so
  dimensions, responsive sources, and optimized formats are generated.
- Use lowercase kebab-case filenames and meaningful alternative text. Use an
  empty `alt` only when an image is entirely decorative.
- Reserve `public/` for files that must bypass processing and retain a stable
  URL, such as favicons or verification files.

## Content

- Use Markdown content collections for static editorial pages that nontechnical
  contributors should be able to update.
- Preserve original wording and meaning when migrating content from an existing
  AKSC site. Do not rewrite, summarize, or omit substantive copy unless the user
  explicitly requests it or a minimal correction is required for accessibility
  or factual accuracy.
- Keep editable copy and metadata in `src/content/`; keep presentation and
  accessibility behavior in Astro components.
- Mirror route and feature names under `src/content/pages/<feature>/`. Use
  `index.md` for the feature's main page and add related entries beside it.
- Give every page one authoritative source. Do not duplicate Markdown content
  in WordPress.
