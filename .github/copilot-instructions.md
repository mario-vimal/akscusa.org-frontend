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
- Set headings, labels, buttons, and navigation in the self-hosted Archivo
  variable font through `font-display`. Set interface text, captions, and
  metadata in Instrument Sans through `font-sans`. Set long-form reading,
  ledes, and pull quotes in Newsreader through `font-serif`. The pairing is
  deliberately inverted from the usual serif-headline default: a grotesque
  states, a serif explains. Do not set a headline in the serif.
- Consume named theme tokens in components; do not introduce isolated hex
  colors or untracked font declarations.
- Keep the shape language flat. Radii stay small (`rounded-sm` to
  `rounded-xl`); nothing is a pill except a true dot. Separate things with the
  `rule` and `rule-strong` hairline tokens rather than with drop shadows, and
  reserve `shadow-soft` for genuinely floating layers such as the mobile nav
  sheet.
- Reuse the shared classes in `global.css` before writing new utilities:
  `eyebrow`, `section-head`, `rule-draw`, `index-figure`, `btn` with its
  variants, `card` and `card-title`, `tag`, `link-underline`, the `grain` and
  `duotone` surfaces, and the `reveal`, `reveal-children`, and `rise` entrance
  animations.
- Keep one idea about lines. A rule on the page is the 2px accent rule that
  draws itself in on scroll — `section-head` carries it, and `rule-draw` is the
  same rule for a section that opens on something other than a label and a
  heading. Do not scatter static grey hairlines above labels, headings, or
  captions, and do not draw a decorative column grid over a section; a line
  that is everywhere separates nothing.
- Do not add decorative overlays. Blurred colour blobs, dot fields, and drawn
  grid lines are decoration standing in for structure, and they are the first
  thing that marks a page as generated.
- Show a poster or flyer with `Poster.astro`, which sizes the figure to the
  artwork and opens it in an in-page `<dialog>` viewer. A reader enlarging an
  image should not lose their place on the page.
- Vary the page rhythm. An eyebrow over a heading over a paragraph over three
  equal cards, repeated down every page, is the shape every template arrives
  in. Alternate ruled indexes, editorial lists, full-bleed ink panels, and
  card grids, and alternate light and dark bands. Two sections in a row that
  open the same way are already one too many.
- Open every page with `PageMasthead`, so the brand blue leads a page rather
  than only edging it. Mark any dark panel with `on-dark` so the focus ring
  and `btn-primary` switch to the light end of the scale.
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
