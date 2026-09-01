import { measurePublicImage } from "~/lib/public-image";

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

export async function sizePanels(
  panels: readonly Panel[],
): Promise<SizedPanel[]> {
  return Promise.all(
    panels.map(async (panel) => ({
      ...panel,
      ...(await measurePublicImage(panel.src)),
    })),
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
