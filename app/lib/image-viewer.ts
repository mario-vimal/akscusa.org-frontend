/**
 * The one piece of geometry an in-page image viewer needs.
 *
 * An image shown with `object-fit: contain` does not fill its own box: the
 * letterbox around it still belongs to the `<img>`, so a click there reports
 * the image as its target even though the reader clicked past the artwork.
 * Anything that closes on an outside click has to measure where the artwork was
 * actually drawn, which is what this does.
 */
export function isOverArtwork(
  image: HTMLImageElement,
  clientX: number,
  clientY: number,
): boolean {
  const box = image.getBoundingClientRect();
  if (!image.naturalWidth || !image.naturalHeight) return true;

  const scale = Math.min(
    box.width / image.naturalWidth,
    box.height / image.naturalHeight,
  );
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;

  const x = clientX - box.left - (box.width - drawnWidth) / 2;
  const y = clientY - box.top - (box.height - drawnHeight) / 2;

  return x >= 0 && y >= 0 && x <= drawnWidth && y <= drawnHeight;
}
