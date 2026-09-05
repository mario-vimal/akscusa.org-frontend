import { parseArgs } from "node:util";

import { formatReport, verifyLinks } from "./links/check.ts";

try {
  const { values } = parseArgs({
    options: {
      strict: { type: "boolean", default: false },
      dist: { type: "string", default: "dist" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(`Usage: node scripts/verify-links.mjs [--strict] [--dist directory]

Always strict: reject broken links/media and retired WordPress/Squarespace URLs.
--strict: accepted for compatibility; the ordinary command is already strict.
--dist: built output directory (default: dist).

No legacy-debt allowances or baselines are used.
All URLs are checked regardless of data-provenance. External HTTP(S) URLs are syntax-checked, not fetched.`);
  } else {
    const report = verifyLinks(values.dist);
    console.log(formatReport(report));
    if (!report.passed) process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
