// Captured from Sveltia 0.201.1's real bundled helpers with CMS_MANUAL_INIT,
// without loading a backend or saving content. The date input/output pairs
// were identical in UTC, Asia/Kolkata and America/Los_Angeles browser contexts.
// https://github.com/sveltia/sveltia-cms/tree/v0.201.1/src/lib/services
// The YAML fixtures were recaptured after media colocation. The pinned runtime
// also verified all 12 owned entry/file/public URL mappings and shared PDFs.
export const sveltiaVersion = "0.201.1";
export const sveltiaRuntimeSha256 =
  "97a332a7f49afa2b286c4e5801272a10723c65a3a4037f5d3caab5242eb41b92";

export const readingInputs = [
  { input: "2026-09-19T15:00", stored: "2026-09-19T22:00:00Z" },
  { input: "2026-12-19T15:00", stored: "2026-12-19T23:00:00Z" },
  { input: "2026-03-07T15:00", stored: "2026-03-07T23:00:00Z" },
  { input: "2026-03-08T15:00", stored: "2026-03-08T22:00:00Z" },
  { input: "2026-10-31T15:00", stored: "2026-10-31T22:00:00Z" },
  { input: "2026-11-01T15:00", stored: "2026-11-01T23:00:00Z" },
] as const;

export const namedEntries = [
  { input: "B. R. Ambedkar", slug: "b-r-ambedkar" },
  { input: "Édouard Glissant", slug: "edouard-glissant" },
  {
    input: "Periyar’s Self‑Respect Movement",
    slug: "periyar-s-self-respect-movement",
  },
  { input: "Reading_Group ~ Notes", slug: "reading_group-~-notes" },
  // The transliterator does not cover every script. Sveltia generated this
  // opaque ID; it is not regenerated when the displayed name is edited.
  { input: "சாதி ஒழிப்பு", slug: "0bd466cd7521" },
] as const;

export const imageUploads = [
  { input: "IMG_1234.JPG", filename: "img_1234.jpg" },
  { input: "a-photo_2.jpg", filename: "a-photo_2.jpg" },
  { input: "cover art.jpg", filename: "cover-art.jpg" },
  { input: "Photo Été.PNG", filename: "photo-ete.png" },
  { input: "B. R. Ambedkar.WEBP", filename: "b-r-ambedkar.webp" },
] as const;

export const pdfUpload = {
  input: "Annual Report.PDF",
  filename: "annual-report.pdf",
} as const;

export const uploadCollision = {
  input: "cover art.JPG",
  existing: "cover-art.jpg",
  filename: "cover-art-1.jpg",
} as const;

export const renamedAuthor = {
  name: "Dr. Bhimrao Ramji Ambedkar",
  originalSlug: "b-r-ambedkar",
  storedSlug: "b-r-ambedkar",
} as const;

export const serializedMeeting =
  "edition: 12\npapers:\n  - file: /media/general-body-meetings/meeting-2030/annual_report-2030.pdf";
export const serializedProgram =
  "posters:\n  - src: /media/programs/new-event/a-photo_2.jpg\n    alt: Event announcement\n  - src: /media/shared/cover-art.webp\n    alt: Event details";
