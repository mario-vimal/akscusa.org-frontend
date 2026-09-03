# Content fidelity audit

Verification that the migration off WordPress (`akscusa.org`) and Squarespace
(`akscusa.squarespace.com`) preserved AKSC's original wording, and did not
paraphrase, summarise, or invent copy.

Audited **2026-09-02** against both live sites, every source page named in
`MIGRATION-TRACKER.md`, every committed flyer and comic panel, and the General
Body report PDFs. **Delete this file with the tracker once both sites are
retired.**

## Method

Every source page named in the tracker, plus every `sourceUrl` in
`cms/content/` and `app/content/`, was fetched from the live sites (123 pages).
The editorial region of each was reduced to text and aligned sentence-by-sentence
against the migrated entry — body copy plus the prose frontmatter fields (`bio`,
`transcript`) — using a token and bigram Dice coefficient, with a document-level
content-word coverage check to separate re-splitting from rewriting.

Text alignment alone is not enough, because the entries that go wrong are the
ones whose source is a picture. So every claim the HTML could not settle was
checked by reading the artefact directly: all 17 program flyers, a sample of the
70 comic and toolkit panels, and the seven General Body report PDFs. Book ISBNs
were checked against Open Library and Google Books, and the tracker's inventory
against both live sitemaps.

Sentence verdicts across the 94 entries that have a source:

| Verdict                          | Sentences | Share |
| -------------------------------- | --------- | ----- |
| Verbatim                         | 3,308     | 90.3% |
| Near-verbatim (punctuation only) | 68        | 1.9%  |
| Reworded                         | 65        | 1.8%  |
| Recombined from source wording   | 12        | 0.3%  |
| Mostly new                       | 7         | 0.2%  |
| Not in any source                | 202       | 5.5%  |

160 of the 202 "not in any source" sentences are the comic and toolkit panel
transcripts, which have no HTML source by design and were checked against the
artwork instead. Fidelity by collection:

| Collection          | Verbatim or near-verbatim |
| ------------------- | ------------------------- |
| `press-releases`    | 546 / 546 — 100%          |
| `speakers`          | 48 / 48 — 100%            |
| `articles`          | 445 / 447 — 99.6%         |
| `interventions`     | 1,697 / 1,719 — 98.7%     |
| `conferences`       | 422 / 455 — 92.7%         |
| `app/content/pages` | 136 / 149 — 91.3%         |
| `book-readings`     | 36 / 47 — 76.6%           |
| `programs`          | 46 / 91 — 50.5%           |
| `comics`, `toolkit` | transcript, see below     |

## What is sound

- **Press releases and articles are intact.** All 546 press-release sentences
  and 445 of 447 article sentences are verbatim. The only source sentences with
  no home in the migration are the WordPress "Share on X" and "Share on
  Facebook" buttons. No statement was softened, shortened, or reworded.
- **Speaker biographies are verbatim**, including the passages that read
  awkwardly in the original. They live in the `bio` frontmatter field, which is
  why a body-only reading of the repository makes them look missing.
- **Comic and toolkit transcripts are exact.** Spot-checked against the panel
  artwork, the transcripts reproduce the lettering character for character,
  including "Nevermind, I'm pretty sure you're not one of those quota guys!
  Hahaha!" and the caption "Aish was lost in thought in school that day." All 70
  panels carry both a transcript and alternative text, as the tracker claims.
- **The tracker's WordPress inventory is exact.** Its 92 source paths match the
  92 URLs in `akscusa.org/sitemap-1.xml` — no invented URL, none missed.
- **Book records are real.** All 10 ISBNs carry valid check digits; 8 resolve on
  Open Library with matching title, author, and publisher, and the remaining 3
  (Indian and small-press editions) were confirmed elsewhere. No ISBN is invented.
- **Documented date corrections are honest.** The notes on the Kilvenmani entry
  (16 December 2018) and the Periyar 140th entry (22 September 2018) both verify
  against the original flyers.
- **`/documents/` copy is verbatim** in `app/content/pages/general-body/index.md`,
  including the Ambedkar quotation.
- **Most program entries check out against their artwork.** All 17 program
  entries were compared with their flyers and, where a flyer was absent, with the
  General Body report PDFs. Ten are accurate on every checkable claim:

  | Entry                           | Checked against                                                           |
  | ------------------------------- | ------------------------------------------------------------------------- |
  | `ambedkar-127th…`               | Flyer: venue, room, street, date, 2–5pm ✓                                 |
  | `ambedkar-on-brahmanism…`       | Flyer: "30 minutes speech followed by 30 minutes questions and answers" ✓ |
  | `aathi-thamizhar-peravai…`      | Flyer: ATP founding, 1994, Coimbatore, aims ✓                             |
  | `keezhadi-to-harvard`           | 2nd General Body report: Irvington Community Center, Fremont ✓            |
  | `kakkoos-documentary-screening` | Flyer: English subtitles, venue, date ✓                                   |
  | `neet-and-social-justice`       | Flyer: 6:30–7:30 PM PST, 8 Sep 2017 ✓                                     |
  | `periyar-139th…`                | Flyer: all four organisers, topic ✓                                       |
  | `periyar-147th…`                | WordPress page: talent list, venue, times, RSVP ✓                         |
  | `caste-and-gender-violence…`    | `/programs/`: designation verbatim ✓                                      |
  | `dr-ambedkar-129th…`            | WordPress page: Zoom ID, dates ✓                                          |

  The `periyar-147th` entry also silently repairs an obvious find-and-replace
  corruption in the source ("147th Birth AThanthairy of Thanthai Periyar"),
  which is a correction the conventions permit rather than a rewrite.

## Findings

Status as of **2026-09-02**. Finding 1 was withdrawn by the maintainer: the 2026
conference is an upcoming page that is still being edited, so it is expected to
diverge from the Squarespace source and is not a migration defect.

| #   | Severity    | File                                                                                              | Problem                                                                  | Status                                                                                                                         |
| --- | ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | —           | `cms/content/conferences/aksc-7th-annual-conference-2026.md`                                      | Diverges from the Squarespace source                                     | Withdrawn — page is live and dynamic                                                                                           |
| 2   | 🔴 Critical | `cms/content/programs/inclusive-campuses-in-an-exclusive-society.md`                              | Five invented questions; the flyer's whole argument dropped              | Flyer content restored and the false "The program asked:" attribution removed; **deletion of the questions awaiting approval** |
| 3   | 🟠 High     | `cms/content/programs/kilvenmani-massacre-50th-anniversary.md`                                    | Wrong venue, wrong city, wrong end time                                  | Fixed                                                                                                                          |
| 4   | 🟠 High     | `cms/content/programs/honor-killings-love-and-caste.md`                                           | Specific biography replaced with a generic sentence                      | Fixed                                                                                                                          |
| 5   | 🟠 High     | `cms/content/programs/periyar-140th-birth-anniversary-celebration.md`                             | Talk titles lost; event theme misattributed to one speaker               | Fixed                                                                                                                          |
| 6   | 🟡 Medium   | `democracy-and-dissent-in-india-today.md`, `keezhadi-and-states-rights-talks.md`                  | Three proper nouns corrupted; an organisation added that no source names | Names fixed; **ASATA removal awaiting approval**                                                                               |
| 7   | 🟡 Medium   | 19 files in `cms/content/book-readings/`                                                          | No basis on either source site                                           | Recorded as an open provenance question in `MIGRATION-TRACKER.md`                                                              |
| 8   | 🟡 Medium   | `app/content/pages/general-body/index.md`                                                         | 32,700 characters of HTML reduced to a PDF link                          | Recorded in `MIGRATION-TRACKER.md`; awaiting a decision                                                                        |
| 9   | ⚪ Low      | `app/content/pages/anti-caste-helpline/index.md`                                                  | Hedge dropped, clause added                                              | Fixed                                                                                                                          |
| 10  | ⚪ Low      | `kakkoos-documentary-screening.md`, `ambedkar-127th-birth-anniversary-celebration.md`, and others | Co-organising groups dropped from flyers                                 | Fixed                                                                                                                          |

### What was changed

Nothing was deleted from the live site. Every correction either fixed a value
that contradicted a source or added material back from one. Where a fix would
have meant deleting text, the false claim attached to it was removed and the
text left in place for the maintainer to decide on — that applies to the five
questions in finding 2 and to the ASATA credit in finding 6, both of which are
still flagged above.

- A new optional `organisers` field on the `programs` collection — schema,
  Sveltia config, and an "Organised by" row in `programDetails` — now carries the
  coalition credit the flyers give. Populated for eight programs.
- **Kilvenmani**: venue corrected to Olive Hyde Program Center, Fremont; end time
  to 5:00 PM; the massacre account, the list of comparable atrocities, the
  documentary's director and year, and the names and ages of all forty-four
  people killed were restored from the flyer.
- **Honor killings**: "V. Shankar" → "V. Sankar"; Tirupur district, the head
  injuries, and the account of how Kausalya became an activist restored; Suganthi's
  350 km march restored in place of the generic sentence.
- **Periyar 140th**: all three talk titles restored, designations kept separate,
  Periyar's epigraph added, eight joint organisers recorded.
- **Democracy and Dissent**: "Sohrabuddin Shah" → "Sohrabuddin Shaikh";
  "award-winning" restored.
- **Keezhadi and states' rights**: "Valley Pond" → "Wally Pond".
- **Ambedkar 127th**: eight organisers and the "life of contradictions" passage
  added.
- **Inclusive campuses**: the flyer's argument, its five speakers, its Ambedkar
  epigraph, and its five joint organisers added above the existing questions.
- **Helpline**: AKSC's original hedged sentence restored.

### Presentation changes made alongside

- The coalition credit is rendered by a new `OrganiserList` component as a ruled
  roll-call rather than a comma-joined value, because at nine partners a single
  joined line stops reading as separate organisations.
- The individual program and comic pages now open with `EntryHeader` instead of
  `PageMasthead`, which is what every other entry page already did and what the
  repository conventions call for. On a single entry the blue band spent a
  screen restating the title before the flyer or the first panel could begin.
- A pre-existing defect in the comic reader ("21panels") was corrected to
  "21 panels".
- Entry pages with a flyer now place it after the header on a phone instead of
  above it. `EntryLayout` and `ProgramLayout` use three grid items rather than
  two, so the poster keeps the right-hand column on a wide screen while falling
  between the title and the details on a narrow one. A reader met an
  unexplained image before the title, with the back link below it.

### 1. The 2026 conference narrative is invented — 🔴 Critical

`cms/content/conferences/aksc-7th-annual-conference-2026.md` opens with seven
paragraphs that appear **nowhere** on `akscusa.squarespace.com/conf-26`, its only
declared source, nor anywhere else on either site. Confirmed absent by exact
string search over the full 1.5 MB page and over every cached source page,
including the two Squarespace pages the tracker omits:

> Is democracy only about voting every few years? Is freedom only about having
> more choices as consumers?

> For many, moving to the United States once symbolized freedom from caste.

> Technology raises similar concerns. AI could be used to better working
> conditions and improve lives.

> They shape how power is maintained, and decide whose voices are heard and
> which are culled; whose lives are valued and whose livelihoods are thrown to
> the wayside.

This is not an addition alongside the original. The source's actual argument was
**displaced**:

> Our lives are regulated by legal and social codes. Legal codes, or laws, are
> written but often applied selectively. Social codes are unwritten but strictly
> observed. […] People affected by these inequalities have responded through
> uprisings, as in the Civil War, or mass mobilization, as in the civil rights
> movement. At times, those in power have been pressured to introduce structural
> reforms, as in the New Deal.

None of that reaches the new site. AKSC's stated framing — that law and social
code interact to hold the status quo, and that rights are won only through
organised action — was swapped for rhetorical questions about consumer choice
and AI. The four external news links in the entry do all resolve, so the
citations are real; the argument around them is not AKSC's.

**Fix:** restore the four source paragraphs verbatim and delete the invented
opening.

### 2. Invented framing questions on the campuses program — 🔴 Critical

`inclusive-campuses-in-an-exclusive-society.md` states "The program asked:" and
lists five questions. None appears on `/programs/`, on the Squarespace site, or
on the committed flyer:

> - Why and how are caste and gender violence continuously present in Indian society?
> - How are atrocities against marginalized communities enabled, and why do they go unpunished?
> - How are the same caste-based practices followed in the United States?
> - What is the role of U.S. organizations and individuals in ending the practice of caste?
> - How can we fight against caste-based discrimination and build a strong and inclusive community?

The flyer (`/media/programs/inclusive-campuses-hall-meeting.jpg`) instead carries
several hundred words that were **not** migrated: the death of Muthukrishnan
Jeevanantham (Rajini Krish) at JNU on 14 March 2017; Rohith Vemula at the
University of Hyderabad on 17 January 2016 as "the sixth such victim, since 2008,
in that one institution alone"; the demand to implement the Thorat Committee
Report; and the argument that gives the entry its point —

> These ordinary looking suicides are nothing but institutional murders; murders
> to suppress the quest for Equality, quest for share in power and quest for
> status and dignity!

Five named speakers and five joint organisers are also dropped. The invented
questions read as generic anti-caste framing; the flyer is specific, evidenced,
and angry. This is the single clearest case of AI slop displacing source material.

**Fix:** replace the five questions with the flyer text, speakers, and organisers.

### 3. Wrong venue and time on the Kilvenmani entry — 🟠 High

The entry records:

```yaml
location: "San Jose Peace and Justice Center, 48 South 7th Street, San Jose, California"
schedule: "3:30 PM to 6:00 PM PST"
```

The flyer says **Olive Hyde Program Center, 123 Washington Blvd, Fremont, CA
94539**, and **3:30–5:00 pm PST**. AKSC's own 3rd General Body report, committed
at `cms/public/media/general-body/aksc-3rd-general-body-report.pdf`, independently
confirms "Kilvenmani Massacre 50th Remembrance Day — Dec 16 2018 — Fremont, CA".

San Jose Peace and Justice Center is a **joint organiser** on the flyer, not the
venue; the co-organiser was mistaken for the location, and the end time moved by
an hour. Two sources in this repository contradict the published page.

The entry also drops the flyer's account of the massacre (25 December 1968, 44
named victims, the comparison list from Karamchedu 1985 to Saharanpur 2017) and
the documentary's attribution — "directed by Mr. Bharathi Krishnakumar released
in 2006" — which the General Body report repeats.

**Fix:** correct `location` to Olive Hyde Program Center, Fremont and `schedule`
to 3:30–5:00 PM PST; restore the flyer's account and the director credit.

### 4. A specific biography replaced with a generic sentence — 🟠 High

`honor-killings-love-and-caste.md` reduces Suganthi's biography to:

> Comrade Suganthi has participated in and led several campaigns against caste
> discrimination and gender violence.

The flyer says:

> Com. Suganthi from All India Democratic Women's Association and Tamil Nadu
> Untouchability Eradication Front is one of the main organizers of statewide
> march covered 350 Kms between June 9 and 23, 2017 to demand effective law to
> tackle honor killings. This march has become very instrumental in mobilizing
> the people against caste discrimination in general and honor killings in
> particular.

An organisation, a 350 km march, its dates, and its demand became "several
campaigns". This is the paraphrase pattern the conventions prohibit: verifiable
detail flattened into a summary that says almost nothing.

Kausalya's account is treated the same way. The flyer records that she belongs to
a Backward Caste, sustained head injuries, attempted suicide, and then "gained
confidence to not only to live but also to fight such injustices and turned a
social activist". The migration replaces all of it with one invented sentence,
**"Kausalya boldly fought for justice for her husband."**, which appears in no
source. Her husband's name is also altered from **V. Sankar** to **V. Shankar**,
and "Tirupur district" is dropped.

**Fix:** restore both biographies verbatim from the flyer.

### 5. Talk titles lost and a theme misattributed — 🟠 High

`periyar-140th-birth-anniversary-celebration.md` lists:

> - **Dr. V. Geetha:** Rationalism, Self-Respect, Women's Rights and Caste Annihilation
> - **Dr. Ma. So. Victor:** Linguist and historian
> - **Mani M. Manivannan:** Language Rights Activist

On the flyer, "Rationalism, Self-Respect, Women's Rights and Caste Annihilation"
is the banner over the whole event — "Speeches on:" — not V. Geetha's talk. The
three actual talk titles are absent from the new site:

| Speaker                | Designation                  | Talk                                            |
| ---------------------- | ---------------------------- | ----------------------------------------------- |
| Dr. V. Geetha          | Activist, Writer & Historian | "Periyar: A Model Public Life"                  |
| Dr. Ma. So. Victor     | Linguist & Historian         | "Social justice in Sangam period & Periyar era" |
| Mr. Mani M. Manivannan | Language Rights Activist     | "Rationalist Foundation of Periyarism"          |

Two speakers have their job description printed where their subject belongs, and
the third is credited with the event's theme. The nine joint organisers named on
the flyer are also dropped.

**Fix:** restore the three talk titles and keep the designation separate.

### 6. Corrupted proper nouns and an unsourced organisation — 🟡 Medium

Three names were altered in transcription from flyer artwork. Each is the same
class of error: a plausible-looking substitution that no source supports.

| File                                      | Source says                             | Site says                                |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `democracy-and-dissent-in-india-today.md` | "Sohrabuddin Shaikh"                    | "Sohrabuddin Shah"                       |
| `honor-killings-love-and-caste.md`        | "V. Sankar"                             | "V. Shankar"                             |
| `keezhadi-and-states-rights-talks.md`     | "Wally Pond Irvington Community Center" | "Valley Pond Irvington Community Center" |

`democracy-and-dissent-in-india-today.md` is otherwise a close transcription of
its flyer, but it also credits three presenters — "Ambedkar King Study Circle,
India Civil Watch, and **Alliance of South Asians Taking Action**". The flyer
credits two: "Ambedkar King Study Circle & India Civil Watch present". No source
on either site names ASATA for this event. (ASATA _is_ named on the separate
2018 Ambedkar 127th flyer, which is the likely source of the confusion.) The
description "An award-winning Indian investigative journalist" also loses
"award-winning".

**Fix:** correct the three names and remove ASATA unless AKSC confirms it.

### 7. Nineteen book readings with no source — 🟡 Medium

`cms/content/book-readings/` holds 25 entries. Both source sites, together,
document **six**: five 2020 sittings on the WordPress monthly reading page
(23 Feb, 15 Mar, 26 Apr, 17 May, 7 Jun) and the Palestine reading list. The
Squarespace book-readings page carries only two sentences of framing and no
schedule at all.

The other **19** — every 2024, 2025, and 2026 sitting, with dates, venues,
chapter ranges, registration links, and flyers — have no basis on either site.
They may well be correct and supplied by AKSC directly, but nothing in the two
sites being retired corroborates them, and the entries carry no note saying where
they came from. Entries dated after this audit (27 June, 18 July, 8 August, and
31 August 2026) assert in the past tense that a reading happened:

> The circle read Chapters 1 to 8 of _Buffalo Nationalism_ […]

**Fix:** record the provenance of these 19 entries in the tracker, and confirm
the future-dated ones with AKSC.

### 8. The 2017–2018 annual report is no longer readable as text — 🟡 Medium

`akscusa.org/annual-report-2017-2018/` is a 32,700-character HTML page: an
introduction, a numbered table of eight programs with dates and venues, the books
read, the audio conferences, and the interventions. The migration keeps only a
link to the 15-page PDF.

The tracker documents this decision, and the PDF is committed, so nothing is
lost outright. But roughly 165 lines of copy that were selectable, searchable,
translatable, and reachable by a screen reader are now inside a binary. This is
the one omission that is a deliberate, recorded choice rather than an error; it
is listed here because it is the largest single body of source text that the new
site does not render.

**Fix:** consider rendering the report body as Markdown on the General Body page,
keeping the PDF as the archival artefact.

### 9. Softened wording on the helpline page — ⚪ Low

> **Source:** Any of the above can produce stress, overwhelm, and in some cases, trauma.
>
> **Migrated:** These experiences can produce stress, overwhelm, and trauma that affect mental well-being.

The qualifier "in some cases" is dropped, which strengthens the claim, and "that
affect mental well-being" is added. On a page about a support helpline, AKSC's
own hedging should stand. The same pattern appears on
`periyar-147th-birth-anniversary-celebration.md`, where "This event is loaded
with fun program people showing their talents expressing Periyar's ideals
through:" becomes "This event included a program for people to express Periyar's
ideals through:".

**Fix:** restore the original sentences.

### 10. Coalition credit dropped from flyers — ⚪ Low

Several program entries drop the co-organising groups their flyers name:

- **KAKKOOS** — seven co-presenters beside AKSC: San Jose Peace and Justice
  Center, Association for India's Development – Bay Area, Ambedkar Association
  of North America, World Thamizh Organization, Siragu Online Magazine, and Naam
  Thamizhar America Arakattalai.
- **Ambedkar 127th** — eight: Association for India's Development – Bay Area,
  San Jose Peace and Justice Center, Alliance of South Asians Taking Action,
  Asha For Education – Stanford, Organization For Minorities of India, Ambedkar
  International Center, and Sri Ravidass Sabha – Bay Area. Its flyer also
  carries Ambedkar's "life of contradictions" passage, which is not migrated.
- **Periyar 140th** — nine. **Inclusive Campuses** — five. **Kilvenmani** — the
  co-organiser was migrated as the venue instead (finding 3).
- **Periyar 147th** — Non-Resident Tamil Indians Association and San Francisco
  Bay Area Periyarists, named on the flyer though not on the WordPress page the
  entry cites.

Coalition credit is substantive for an organisation whose case is that anti-caste
work is done in alliance. The `programs` schema has no field for it.

**Fix:** add an `organisers` field to the programs schema and populate it from
the flyers.

## Tracker accuracy

The tracker is accurate on WordPress and slightly incomplete on Squarespace.

- The 92 WordPress source paths reconcile exactly with the live sitemap.
- Two pages in `akscusa.squarespace.com/sitemap.xml` are not listed: `/new-page`
  (empty) and `/events/conf2025` (a duplicate of the 2025 conference page).
  Neither carries content, but the tracker states both sitemaps were reconciled.
- The tracker's own summary of the 2026 conference — "the incorrect 2025 checkout
  link is not reproduced" — is accurate and correctly implemented.
- The tracker does not record that program entries were transcribed from flyer
  artwork. That is the main source for 14 of them, it is where findings 2 to 6
  originate, and it deserves a row of its own, as the comics decision has.

## Recommendation

Findings 1 and 2 should be corrected before either source site is retired, since
the WordPress and Squarespace originals are currently the only record of the
displaced text. Findings 3 to 6 are factual corrections that can be made
entirely from files already committed to this repository — the flyers under
`cms/public/media/programs/` and the General Body PDFs.

The migration is, on the whole, faithful: the press releases, articles,
interventions, speaker biographies, and comic transcripts hold up under
sentence-level comparison, and the tracker's inventory is honest. The damage is
concentrated where a page had no HTML body to copy — the 2026 conference, and
the program entries whose real content lives inside a JPEG. That is where a
writer had to compose rather than transcribe, and it is where the invented
material appears.
