# Repository conventions

## Visual system

- Use the Ambedkar blue scale in `app/styles/global.css` as the primary brand
  palette. Use the teal `accent` scale as a controlled accent, not as a
  competing primary.
- Do not reintroduce saffron or any orange accent. Saffron is the colour of
  Hindutva, which AKSC organises against, so it contradicts the content it
  would sit beside.
- Reserve the `alert` crimson for urgency and care, such as the emergency
  banner and content notes. Do not use it decoratively; a red that appears
  everywhere stops carrying a warning. Keep it crimson rather than vermillion
  so it never reads as saffron.
- Set body copy and interface text in the self-hosted Cabin variable font
  through the global `font-sans` token. Set page titles, section headings,
  card titles, pull quotes, and Markdown headings in Source Serif 4 through
  `font-display`. The shift between the two carries the hierarchy, so do not
  make a heading a heading with size alone.
- Consume named theme tokens in components; do not introduce isolated hex
  colors or untracked font declarations.
- Reuse the shared classes in `global.css` before writing new utilities:
  `eyebrow`, `btn` with its variants, `card`, `tag`, `link-underline`, the
  `pattern-dots`, `pattern-grid`, `grain`, and `duotone` surfaces, and the
  `reveal` and `reveal-children` entrance animations.
- Open every page with `PageMasthead`, so the brand blue leads a page rather
  than only edging it. Mark any dark panel with `on-dark` so the focus ring
  switches to the light end of the accent scale.
- Prefer `translate` over `transform` for hover lifts. A scroll-driven reveal
  animation owns `transform`, and an animated property always beats a hover
  rule.
- Reduce photography to the brand blue with `duotone`; leave AKSC's own
  posters and flyers in their original colours, because their colour carries
  information.
- Check contrast when changing a colour token. Body and interactive text needs
  at least 4.5:1, and a focus indicator at least 3:1 against every background it
  can land on, including the dark blue sections. Check tinted text against the
  lightest point of the gradient behind it, not against the section's base.

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

## CMS or static rendering

- Always analyse whether a page needs the CMS or whether static rendering is
  enough, and do it before writing code. State the decision and the reasoning
  in the task, the pull request, or the migration tracker row.
- Default to static rendering. Reach for a Sveltia collection only when the
  evidence for it is positive, not merely because content is editorial.
- Choose a CMS collection when all three hold: several entries share one shape,
  more entries will arrive over time, and a nontechnical contributor needs to
  publish them without a developer.
- Choose static rendering when the content is a single page, changes rarely, or
  is really layout and presentation. Put such copy in `app/content/pages/` and
  keep the behaviour in an Astro component.
- Do not model a one-off page as a collection with a single entry, and do not
  add a CMS field no editor will fill in.
- Do not add a collection for a page whose only reason to change is a redesign;
  that is a component concern, not editorial data.
- Revisit the decision as a page grows. Promote static copy into a collection
  once a second entry of the same shape appears, and retire a collection back
  to static copy if it never gains one.

## Data

- Store customer order records in Cloudflare D1. Do not use D1 for editorial
  content or expose order data through static content files.
- Access D1 only from server-side routes through a Cloudflare runtime binding.
- Keep payment credentials and customer data out of Git, client bundles, logs,
  and Sveltia CMS.
