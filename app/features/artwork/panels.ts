import { fileURLToPath } from "node:url";

import sharp from "sharp";

/**
 * A panel as it is stored: a committed image, a description of the drawing,
 * and the words drawn inside it.
 */
export interface Panel {
  src: string;
  alt: string;
  transcript?: string;
}

/** A panel with the intrinsic size read off the committed file. */
export interface SizedPanel extends Panel {
  width: number;
  height: number;
}

export interface TranscriptLine {
  /** Who says it, when the panel makes that clear. */
  speaker?: string;
  text: string;
}

const publicDirectory = fileURLToPath(
  new URL("../../../cms/public", import.meta.url),
);

const sizes = new Map<string, Promise<{ width: number; height: number }>>();

/**
 * Panels are served straight from the public directory, so Astro never sees
 * them as an import and cannot supply their dimensions. Reading the header at
 * build time gives every panel a width and a height, which is what keeps a page
 * of 37 images from reflowing as each one arrives.
 *
 * Hard-coding an aspect ratio instead would break the first time an artist
 * sends a panel that is not square.
 */
function measure(src: string) {
  const cached = sizes.get(src);
  if (cached) return cached;

  const measurement = sharp(`${publicDirectory}${src}`)
    .metadata()
    .then(({ width, height }) => {
      if (!width || !height) {
        throw new Error(`Could not read the dimensions of ${src}.`);
      }
      return { width, height };
    });

  sizes.set(src, measurement);
  return measurement;
}

export async function sizePanels(
  panels: readonly Panel[],
): Promise<SizedPanel[]> {
  return Promise.all(
    panels.map(async (panel) => ({ ...panel, ...(await measure(panel.src)) })),
  );
}

/**
 * Splits a transcript into speakers and their lines, so a panel's lettering is
 * set as a script rather than as one run of text. A line with no speaker, such
 * as an unlabelled narration box, is kept as it is.
 */
export function parseTranscript(transcript: string): TranscriptLine[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^([^:]{1,48}):\s+(.+)$/s.exec(line);
      return match ? { speaker: match[1], text: match[2] } : { text: line };
    });
}
