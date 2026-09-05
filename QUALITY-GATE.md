# Pre-launch quality gate

**Review date:** 2026-09-04

**Reviewed commit:** `1916069e9022312002db21a4ad288a8cd2d7ce90`

**Verdict at review:** **NO-GO**

**Remediation status:** Code repairs implemented; owner-dependent release
acceptance remains open. Completed items below have automated regression
coverage. No production deployment is authorized by this status.

The review found **33 actionable issues: 5 P1, 23 P2, and 5 P3**. This is the
repository's remediation plan, not a claim that the issues have been fixed.
Source locations and measurements describe the reviewed commit; reproduce the
relevant condition before changing newer code.

Work through the subprojects below in release-impact order, addressing P1 items
first. Mark an item complete only with a reproduction of the original failure,
evidence that the correction works, and regression coverage where applicable.
Record completion evidence beside the item. Any deferred issue needs an explicit
owner decision, reason, and follow-up; an unchecked box is not a waiver.

| Priority | Meaning                                                                               |
| -------- | ------------------------------------------------------------------------------------- |
| P1       | Launch or external-editor handoff blocker                                             |
| P2       | Confirmed functional, accessibility, or reliability defect to address before sign-off |
| P3       | Lower-priority edge case or polish                                                    |

Keep setup instructions in [README.md](README.md) and unrelated work in
[TODO.md](TODO.md). This plan supersedes the obsolete migration tracker and
historical fidelity audit; their remaining owner decisions are retained below.
It is self-contained and does not require the original review session's
temporary files.

## Architecture and scope decisions

Retain static-first Astro, feature-local queries and presenters, shared schemas,
stable content IDs, and the centralized publication/date rules. The architecture
does not need a rewrite.

**CMS versus static:** Repeating editorial records remain CMS-managed. One-off
copy and presentation remain static. None of these repairs requires speculative
collections, D1 commerce, or server rendering.

**Media decision:** Keep static delivery, but colocate each media-owning CMS
record and its assets in `cms/content/<collection-folder>/<slug>/`: `index.md`
and the files it uses. The initial shared `archive/` staging layout has been
removed: 121 records and 308 per-entry media files are now colocated. Public
`/media/<collection-folder>/<slug>/...` paths are generated/served by the shared
integration, not another committed copy.

**Retirement decision:** `akscusa.org` will serve this codebase. Obsolete
application URLs and provenance must be removed, not exempted as historical
`sourceUrl` links. Keep the new canonical hostname and genuine third-party
citations. The migration has removed 90 obsolete source values and rewritten 209
URLs; the strict built-output gate must confirm the final result.

Do not reopen the existing decisions against a service worker, a server-only
500 page before server rendering exists, or blanket legacy URL redirects.
Preserve original editorial wording and obtain approval for substantive changes.

## Baseline and limits

| Area                 | Observation at the reviewed commit                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Existing validation  | `npm run validate` passed: 186 tests across 16 files, 128 generated pages, and 33 smoke-tested routes                       |
| Responsive rendering | 128 pages in Chromium and 26 representative pages in Firefox at 320, 375, 768, and 1440px: 616 page/viewport renders        |
| Document health      | No detected document-level horizontal overflow, missing/multiple H1s, duplicate IDs, or uncaught page JavaScript errors     |
| Accessibility        | 154 axe runs; confirmed violations on 25 pages, including contrast failures on 23                                           |
| Interactions         | 75 scenarios: 59 passed; 16 failures represented five distinct defects                                                      |
| Content schemas      | All 138 current CMS records passed; prospective authoring and serialization exposed failures                                |
| Links and media      | 514 local/cutover targets examined; existing root-relative links and fragments passed, but legacy-host dependencies did not |
| Dependencies         | Production-only and complete npm audits reported no known advisories; this is not security certification                    |

The passing baseline is not sufficient for launch. Several CMS findings were
reproduced through pinned Sveltia behavior and schema/serializer fixtures, not
authenticated publishing. External forms and payment destinations were opened
read-only; no submission, payment, receipt, message, or call was completed.
Production operations and human acceptance remain part of subproject 5.

## 1. Cutover and essential visitor destinations

- [x] **P1 `CUTOVER-MEDIA`** Preserve the **164 unique WordPress assets**
      referenced **194 times across 42 pages** and update their live references.
      They return 404 against the new deployment even while WordPress still
      serves them. Include images, flyers, and PDF resources, not just page URLs.
      Source preservation is complete for 163 recoverable files, including all
      31 PDFs. The already-missing fundraising image is recorded below rather
      than replaced with invented artwork.
- [x] **P1 `CUTOVER-ACTIONS`** Repair the testimony contribution action at
      `app/content/pages/testimonies/index.md:37`, which points to the missing
      `/share-your-testimonies/` route. Resolve the separate `/who-said-what/`
      resource in the SB 403 entry. Use approved destinations, not guessed URLs.
- [ ] Confirm the 2026 conference registration/ticketing destination. The hero
      now points to the local conference page, but registration remains
      unconfirmed; a correct local link alone does not complete that journey.
- [x] Add a repeatable link/asset gate that resolves the production hostname
      against the new build. Distinguish live visitor destinations from
      `sourceUrl` provenance and deliberately retired inbound URLs.

**Exit criteria:** All live media and contribution/registration actions work
against the final domain without depending on the retiring applications.
The existing decision against blanket redirects is preserved.

## 2. External-editor publication gate

- [ ] **P1 `RELEASE-MAIN`** Enforce validation and appropriate reviews on the
      actual production branch. At review, the GitHub API reported `main` as
      unprotected with no rulesets in `mario-vimal/akscusa.org-frontend`, while
      `.github/workflows/validate.yml:8-9` ran only on PRs. Account for direct
      writes, bypass privileges, and Sveltia's standalone asset saves, which do
      not use the entry editorial workflow. Recheck the target repository if
      production uses a different one.
      **Code complete:** validation now runs on pushes and reviewable PRs.
      **Owner action:** enable required checks/reviews in repository settings;
      no authenticated settings change was available during this work.
- [x] **P1 `CMS-YAML`** Parse frontmatter as YAML in
      `scripts/content/general-body.test.ts:21-22` and
      `scripts/content/programs.test.ts:17-20`, rather than extracting quoted
      strings with regexes. An unchanged Sveltia round-trip makes one detected
      PDF become zero and two posters become zero. Align accepted image
      extensions with the shared schema instead of a JPG-only assumption.
- [x] **P1 `CMS-TIMEZONE`** Align the reading datetime widget at
      `cms/public/admin/config.yml:708` with `app/schemas/shared.ts:97`.
      A newly serialized `2026-09-19T15:00:00` becomes 8 AM Pacific on a UTC build
      instead of the intended 3 PM. Use explicit Pacific authoring with an
      offset-preserving or UTC output contract; use date-only controls for
      calendar-only records.
- [x] **P2 `CMS-ISBN`** Allow a blank optional ISBN in the widget pattern at
      `cms/public/admin/config.yml:539-548`. The schema already permits it;
      Sveltia still applies the pattern when `required` is false. Align accepted
      nonempty input with the schema's normalization.
- [x] **P2 `CMS-SLUG`** Make CMS filenames, Astro IDs, and relation values agree.
      Sveltia generates `b.-r.-ambedkar` for "B. R. Ambedkar", while Astro uses
      `b-r-ambedkar` and the relation schema requires ASCII kebab-case. Cover
      initials, curly punctuation, and accented names. Start with
      `cms/public/admin/config.yml:594-595` and `app/schemas/shared.ts:129-135`.
- [x] **P2 `CMS-UPLOAD`** Align upload controls with their schemas. Ordinary
      names such as `IMG_1234.JPG`, `a-photo_2.jpg`, and `cover art.jpg` currently
      fail the local-media contract after selection. Normalize filenames and
      constrain formats, remote URLs, and providers per field, including
      PDF-only documents. See `cms/public/admin/config.yml:505-509`,
      `app/schemas/shared.ts:49-55`, and `app/schemas/organization.ts:43-48`.
- [x] **P2 `CMS-DELETE`** Reconcile entry deletion with fatal orphan-media
      tests. Shared absolute media folders retain assets that Sveltia does not
      automatically remove; deleting `caste-has-a-cost` leaves 37 rejected
      panels. Make retention nonblocking or review exclusively owned asset
      removal atomically. Never delete shared media indiscriminately. See the
      orphan checks in `scripts/content/{artwork,programs,general-body}.test.ts`.
- [x] **P2 `CMS-PREVIEW`** Add accurate `preview_path` values for all relevant
      collections in `cms/public/admin/config.yml`; none of the 14 collections
      currently has one. Embedded records need appropriate parent-page
      destinations. Explain how frontmatter `draft` affects build-based previews.
- [x] **P2 `CMS-R2`** Reconcile the media policy and wire the chosen controls.
      Hero images and speaker portraits use string widgets, so adding a global
      R2 library does not create upload controls. Global providers can also be
      offered to fields that reject remote URLs. Align field-specific widgets,
      provider restrictions, schemas, README, and repository instructions.
      **Resolution:** colocated static media and a shared namespace, not an R2
      dependency. Unsupported dated archive paths are rejected.
- [x] **P3 `CMS-HINT`** Quote or block-format the hint at
      `cms/public/admin/config.yml:118-119`. Its unquoted comma creates an
      unintended property and fails the pinned CMS JSON schema. The current
      runtime ignores it; do not describe this as a proven startup failure.
- [x] **P3 `ISBN-PREFIX`** Require an ISBN prefix as well as a checksum in
      `app/features/books/isbn.ts:11-23`. Both `0000000000000` and the non-ISBN
      barcode `4006381333931` currently pass.
- [ ] Confirm the deployed `CMS_REPO`, authenticator/OAuth configuration,
      external-collaborator permissions, and usable error recovery. Preserve the
      intentionally inert local backend default.

**Exit criteria:** Normal new/edit/upload/delete/rename fixtures pass using
actual CMS serialization, field controls match schemas, and the production
branch enforces review and validation. Complete authenticated editor acceptance
in subproject 5 before handing the CMS over.

## 3. Accessibility and interaction repair

- [x] **P2 `NAV-HEIGHT`** Size the mobile sheet from its actual top to the
      viewport bottom, not a fixed header estimate.
      `app/components/navigation/MobileNav.astro:57` produces a sheet ending at
      y=866 on an 800px viewport; its last link remains below the screen even at
      maximum scroll. Reproduce from the page top at 320px and 375px.
- [x] **P2 `NAV-RESIZE`** Close/reset the mobile disclosure when the desktop
      breakpoint hides it. Opening it and resizing to 1440px leaves root
      `overflow: hidden` behind an invisible menu. See
      `app/components/navigation/nav-disclosure.ts:46-49`.
- [x] **P2 `A11Y-CONTRAST`** Replace failing muted-text opacity combinations
      with contrast-safe named tokens. Examples include 3.29:1 section counts,
      3.88:1 search labels, and 4.09:1 session dates where 4.5:1 is required.
      Start with `app/styles/global.css:623-631,926-933`, `ReadingLog.astro`,
      `EditorialIndex.astro`, and `SectionLanding.astro`.
- [x] **P2 `A11Y-LINKS`** Remove or name decorative image-only links in
      `HomeReading.astro`, `ReadingLog.astro`, and `AuthorDetail.astro`.
      `alt=""` plus `tabindex="-1"` still exposes an unnamed link to assistive
      technology. Ten pages were affected.
- [x] **P2 `A11Y-DATE`** Put accessible date text inside the spotlight's
      `<time>` at `app/features/home/components/HomeSpotlight.astro:40-58`.
      Its prohibited `aria-label` does not replace the date parts hidden with
      `aria-hidden`.
- [x] **P2 `A11Y-LISTS`** Preserve list/listitem semantics in the homepage
      reading and quotation carousels, or deliberately use a non-list structure.
      Their `<li role="group">` children currently break the `<ul>` semantics.
- [x] **P2 `A11Y-TABLE`** Give wide prose tables a labeled, keyboard-focusable
      scrolling wrapper. The organization page's table cannot be reached for
      keyboard scrolling at 320px. Start with
      `app/features/editorial/components/ProseContent.astro:199-213`.
- [x] **P2 `A11Y-FOCUS`** Draw flyer focus indicators on the outer tile.
      `app/styles/global.css:779-787,843-849` clips the anchor's offset outline;
      reduced motion also removes the focus lift. Reuse the approach already
      used for card and panel-frame focus rings.
- [x] **P2 `CAROUSEL-FOCUS`** Separate pointer and keyboard-focus pause states
      in `app/features/home/carousel.ts:218-240`. Focus the quotation viewport,
      move the pointer over it and away, and wait: it currently advances while
      keyboard focus remains inside.
- [x] **P2 `FILTER-NOJS`** Hide editorial filter controls until enhancement is
      ready, or provide real fallback links. Six blog buttons currently remain
      visible and inert without JavaScript. Match the progressive-enhancement
      behavior of the reading log and carousels.
- [x] Preserve the working skip link, keyboard/Escape menus, search clear/facet
      behavior, shareable filters, poster dialogs, comic paging/focus return,
      no-JS transcripts, and branded 404 recovery.

**Exit criteria:** The confirmed accessibility and interaction defects are
closed and covered by focused browser regressions. Exercise 320, 375, 768, and
1440px, keyboard navigation, reduced motion, disabled/failed JavaScript, and
breakpoint changes. Body/interactive text must clear 4.5:1 and focus indicators
3:1 on every supported background, including dark panels.

## 4. Calendar and loading reliability

- [x] **P2 `READING-LINK`** Carry the participation URL through the reading
      presenters and render an accurately labeled action. The September 19
      reading has a working URL, but neither its index presentation nor its
      entry renders it. See `app/features/book-readings/presenters.ts:53-81`.
- [x] **P2 `READING-DAY`** Use a Pacific-calendar-day policy for readings.
      At September 5, 2026, 07:00 PDT, the September 4, 19:00 PDT reading still
      passes the UTC-based upcoming check and displaces the real next session.
      Keep this distinct from date-only editorial policy. See
      `app/lib/collections.ts:56-65` and
      `app/features/book-readings/queries/circle.ts:40-42`.
- [x] **P2 `READING-DRAFT`** Preserve distinct resolved-book, unpublished-book,
      and no-book states through presentation and facets. Drafting a referenced
      book currently labels its readings "Articles & papers". See
      `app/features/book-readings/presenters.ts:305,343-347`.
- [x] **P2 `HOME-FALLBACK`** Select the latest gathering across collections
      rather than taking the first conference-first concatenation.
      `app/features/home/queries/featured.ts:135-139` can prefer an October 2025
      conference to a June 2026 program.
- [x] **P2 `READING-TENSE`** Use neutral counts or distinguish held and
      scheduled sittings. `BookDetail.astro:144-150` says "Read at one session"
      when the only session is in the future; author metadata has the same
      problem at `app/features/authors/presenters.ts:85-88,125-128`.
- [x] **P2 `LOAD-FONTS`** Stabilize fallback font metrics and prioritize critical
      font delivery without changing the brand's font roles. The helpline
      produced CLS **0.209** in the initial cold-mobile observation and all
      three repeats at 375x812. Inspect `app/styles/global.css:1-42` and
      `app/layouts/BaseLayout.astro`.
- [x] **P2 `LOAD-POSTERS`** Supply dimensions for public-file posters in
      `app/components/ui/Poster.astro:70-76`, reusing
      `app/lib/public-image.ts`. A delayed poster moved the following desktop
      poster roughly 509px. Define any remote-image contract separately.
- [x] **P3 `CONFERENCE-DAY`** Keep registration wording through the effective
      final conference day. `app/features/editorial/presenters.ts:238-246`
      currently compares against midnight and switches to archive wording
      prematurely.
- [x] **P3 `SORT-TIES`** Add a stable ID tie-breaker to dated archive ordering
      in `app/lib/collections.ts:44-49`. Equal-date entries currently change
      order with loader completion timing. Preserve explicit reference order
      for authors and speakers.
- [x] **P3 `TITLE-PREFIX`** Require a title boundary before shortening a
      session title in `app/features/book-readings/titles.ts:38-45`.
      `sessionLabel("Ambedkarism and Marxism", "Ambedkar")` must not become
      "Ism and Marxism".
- [ ] Define how static upcoming/next labels are refreshed between editorial
      builds, so correct build-time logic does not remain stale indefinitely.
      A scheduled Cloudflare build trigger needs the owner's deployment access
      and an agreed schedule; no speculative trigger or credential was added.

**Exit criteria:** Session actions, calendar boundaries, draft states, and
temporal wording agree across pages. Test UTC and Pacific build environments,
same-day and multi-day events, and deterministic ordering. Repeat the cold-load
probe with 150ms latency, 1.6 Mbps download throughput, and 4x CPU slowdown;
target CLS at or below 0.1. Local measurements do not replace production field
performance.

## 5. Maintainability and human launch acceptance

### Guardrails for contributors and smaller models

- [x] Enforce the important import/type/collection-access boundaries with
      narrowly scoped lint rules. Current probes accepted `../` imports,
      collection reads outside the intended layer, and `as unknown as`.
- [x] Add focused regressions for CMS round-trips and prospective entries,
      reading-log/author presentation, cross-collection selection, and calendar
      boundaries. Test the contracts rather than only current migrated fixtures.
- [x] Keep a repeatable browser/link/accessibility gate for the shared
      interactions. The existing 33-route content-marker smoke test is not
      sufficient to detect the reviewed failures.
- [x] Move pure href/vocabulary helpers out of Astro query modules where that
      is needed for isolated presenter tests. Do not add abstraction layers or
      split working modules without a concrete benefit.
- [x] Reconcile README and repository instructions with actual per-collection
      media ownership, frontmatter draft versus workflow Draft, and rename
      behavior across independent unpublished branches.
- [x] Retire stale comments about ISBN-based lookup and sitting order. Correct
      historical audit status without reintroducing the withdrawn 2026
      conference accusation; the pending ASATA-removal note is also stale.
- [x] Establish a shared Open Graph metadata contract with an official brand
      image and the page's existing canonical title, description, and URL.

### Acceptance that was not completed during the review

- [ ] Complete an authorized external-editor journey on a disposable
      preview/fork: create related records, upload, edit, preview, request
      review, publish, rename, remove an asset, discard, and delete. Verify
      error recovery and visibility of drafts. Test a permalink change through
      the documented maintainer whole-directory procedure: the pinned CMS's
      Edit Slug action alone does not relocate existing media.
- [ ] Exercise Safari/WebKit and physical touch devices. The review's local
      WebKit launch was blocked by missing OS libraries, not a demonstrated
      application failure.
- [ ] Perform real screen-reader acceptance; automated rules and accessibility
      tree inspection are not full WCAG certification.
- [ ] Verify production DNS/TLS, Cloudflare cache/headers, preview access,
      rollback/recovery, and responsibility for urgent helpline updates.
- [ ] Complete authorized membership, payment/receipt, and contribution
      acceptance using approved test data. Do not submit real transactions,
      messages, or calls merely to mark this item complete.
- [ ] Obtain editorial sign-off for the 19 reading records with unresolved
      provenance and the remaining explicitly labeled later editorial text.
      Reconcile the standing Sunday arrangement with dated Saturday readings.
- [ ] Confirm individual artist credits for the two comics and three toolkit
      scenarios. Current AKSC credits are preserved; do not infer an artist
      from an old filename or invent an attribution.
- [ ] Resolve the 2017-2018 report's accessible HTML versus PDF-only archive
      decision with the content owner.
- [x] Run the repository's full validation after the repairs.
- [ ] Record production field performance and operational observations
      separately from local results after an authorized deployment.

**Exit criteria:** Executable guardrails and current contributor documentation
are in place. Editorial, authenticated-editor, accessibility/device, and
production operations acceptance have named sign-off and dated evidence.

### Owner-dependent content decisions

These are not permission to retain obsolete URLs or to invent missing content.
All recoverable media and existing substantive copy are preserved locally.

| Item                                 | Input still needed                                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026 conference registration         | An approved current registration/ticketing destination; do not recreate an old checkout or speculate about first-party commerce                                                                                                                                          |
| Standing reading arrangement         | Confirm the published Sunday schedule against the dated Saturday sittings                                                                                                                                                                                                |
| Reading provenance                   | Confirm the records listed below against flyers or organizational records; lack of a recorded source is not a finding that a reading was invented                                                                                                                        |
| Inclusive Campuses framing questions | Decide whether to retain the explicitly labeled later editorial questions; the meeting's original argument remains above them                                                                                                                                            |
| Comic/toolkit attribution            | Confirm the actual artists and any additional required credits                                                                                                                                                                                                           |
| 2017-2018 annual report              | Decide whether to restore a full HTML reading edition alongside the preserved PDF                                                                                                                                                                                        |
| 2018 fundraising illustration        | Supply the original if it should be restored. The old 119-by-119 image was already unavailable: original, CDN, exact thumbnail, attachment lookup, and archive lookup failed. Only its broken image reference was removed; the appeal text and other media remain intact |

The 19 reading directories below are under `cms/content/book-readings/`.
Each contains `index.md`; directory dates are historical identifiers, **not**
the authoritative meeting date. Read the entry's `date` field.

```text
2024-10-05-caste-pride-chapters-15-18
2025-03-15-waiting-for-a-visa
2025-04-05-annihilation-of-caste
2025-04-26-by-any-means-necessary-chapters-1-2
2025-05-10-by-any-means-necessary-chapters-3-5
2025-05-31-by-any-means-necessary-chapters-6-9
2025-06-14-by-any-means-necessary-chapters-10-12
2025-06-28-the-will-to-change-chapters-1-4
2025-07-19-the-will-to-change-chapters-5-8
2025-10-25-the-will-to-change-chapters-9-11
2026-01-10-india-is-broken-chapters-7-9
2026-01-31-india-is-broken-chapters-10-14
2026-02-21-india-is-broken-chapters-15-19
2026-06-06-ambedkar-towards-an-enlightened-india
2026-06-27-buffalo-nationalism-chapters-1-8
2026-07-18-buffalo-nationalism-chapters-9-21
2026-08-08-buffalo-nationalism-chapters-22-33
2026-08-31-buffalo-nationalism-chapters-34-42
2026-08-31-why-were-women-enslaved
```

## Release decision

### Completed technical evidence

The assembled gate has passed on 2026-09-04:

- Astro/TypeScript diagnostics, ESLint, and formatting.
- 604 unit tests across 46 files, including current CMS content, serialization
  fixtures, media ownership, and unsafe-path regressions.
- 129 generated pages and 308 emitted, entry-owned media files.
- 130 HTTP smoke routes plus the favicon.
- 11,511 parsed references with zero blocking local or retired-site targets.
- 57 browser tests passed in Chromium/Firefox; one Firefox-only CDP performance
  case is intentionally skipped because that measurement runs in Chromium.
- Required widths, 200% text reflow, no-JS controls, keyboard/focus behavior,
  automated accessibility, and the cold-mobile CLS budget are covered.
- The local Who said What game preserves all five questions, explanations,
  citations, and six colocated photographs.

The checked-in browser suite discovers pages from the sitemap. The smoke gate
also verifies the emitted page inventory, so an editor changing a title or
removing an entry does not fail a test that pins an old sample record.

| Gate                                 | Status                                        | Owner / dated evidence                                                                                           |
| ------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Cutover and essential destinations   | Code complete; owner input remains            | Local links/media pass; conference registration and the unavailable historic illustration remain owner decisions |
| External-editor publication          | Code complete; owner access remains           | CMS contracts pass; production branch rules, authentication and real publishing acceptance require owner access  |
| Accessibility and interactions       | Automated gate complete                       | Browser checks pass; real screen-reader/Safari/physical-device sign-off remains                                  |
| Calendar and loading reliability     | Code complete; deployment policy remains      | Calendar regressions and CLS budget pass; scheduled rebuild policy/access remains                                |
| Maintainability and human acceptance | Guardrails complete; human acceptance remains | Typed/linted boundaries, tests and current docs are in place; content and operational approvals remain           |

**Code completion is not production sign-off.** The unchecked owner/access
items above remain deliberately open. Record their acceptance explicitly; do
not infer it from a passing build or from the absence of a production test.
