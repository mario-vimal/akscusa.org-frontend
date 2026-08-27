---
applyTo: "src/**/*.{astro,css,ts,tsx}"
---

# Figma implementation

- When a task references a Figma design, use the configured Figma Dev Mode MCP
  server as the source of truth before writing UI code.
- Capture the target file, page, frame, and node identifiers in the task or pull
  request so the design input is reproducible.
- Map reusable colors, typography, spacing, radii, and shadows to Tailwind theme
  tokens in `src/styles/global.css`; do not scatter unexplained arbitrary values
  through components.
- Prefer semantic HTML and accessible native controls. Match visual hierarchy
  without sacrificing keyboard navigation, focus visibility, text resizing, or
  reduced-motion preferences.
- Reuse existing layouts and components before creating new ones. Keep content
  data separate from presentation when it will eventually come from WordPress.
- Compare the implementation at the frame's defined viewport sizes and document
  intentional deviations from the source design.
