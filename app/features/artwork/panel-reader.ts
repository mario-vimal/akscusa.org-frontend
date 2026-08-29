import { isOverArtwork } from "~/lib/image-viewer";

/*
 * Turns a published sequence of panels into a reader: a full-screen viewer with
 * keyboard paging, and one control that opens every transcript at once.
 *
 * Everything this adds is additive. The panels, their numbers, their anchors and
 * their transcripts are all in the served HTML, so a reader without JavaScript
 * loses the viewer and keeps the comic.
 */
export function mountPanelSequences(): void {
  const sequences = document.querySelectorAll<HTMLElement>(
    "[data-panel-sequence]",
  );

  for (const sequence of sequences) {
    const items = [...sequence.querySelectorAll<HTMLElement>("[data-panel]")];
    const dialog = sequence.querySelector<HTMLDialogElement>(
      "[data-panel-dialog]",
    );

    const toggle = sequence.querySelector<HTMLButtonElement>(
      "[data-transcripts-toggle]",
    );

    if (toggle) {
      const panelTranscripts = [
        ...sequence.querySelectorAll<HTMLDetailsElement>(".panel__transcript"),
      ];

      toggle.hidden = false;
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-pressed") === "true";

        for (const transcript of panelTranscripts) transcript.open = !open;
        toggle.setAttribute("aria-pressed", String(!open));
        toggle.textContent = open
          ? "Show every transcript"
          : "Hide every transcript";
      });
    }

    if (!dialog || items.length === 0) continue;

    const image = dialog.querySelector<HTMLImageElement>("[data-panel-image]");
    const counter = dialog.querySelector<HTMLElement>("[data-panel-counter]");
    const transcript = dialog.querySelector<HTMLElement>(
      "[data-panel-transcript]",
    );
    const previous = dialog.querySelector<HTMLButtonElement>(
      "[data-panel-previous]",
    );
    const next = dialog.querySelector<HTMLButtonElement>("[data-panel-next]");
    const close = dialog.querySelector<HTMLButtonElement>("[data-panel-close]");
    const stage = dialog.querySelector<HTMLElement>(".panel-viewer__stage");

    if (
      !image ||
      !counter ||
      !transcript ||
      !previous ||
      !next ||
      !close ||
      !stage
    ) {
      continue;
    }

    const unit = sequence.dataset.panelUnit ?? "Panel";
    let current = 0;
    let openedAt = 0;

    const show = (index: number) => {
      current = Math.min(Math.max(index, 0), items.length - 1);

      const item = items[current];
      const source = item.querySelector("img");
      if (!source) return;

      image.src = source.src;
      image.alt = source.alt;
      image.width = Number(item.dataset.panelWidth);
      image.height = Number(item.dataset.panelHeight);
      counter.textContent = `${unit} ${current + 1} of ${items.length}`;

      const lines = item.querySelector("[data-panel-transcript-source] ol");
      transcript.replaceChildren(...(lines ? [lines.cloneNode(true)] : []));

      const focused = document.activeElement;

      previous.disabled = current === 0;
      next.disabled = current === items.length - 1;

      // Disabling a button blurs it synchronously, dropping focus onto the
      // body. The arrow key handler is bound to the dialog, so paging by
      // keyboard would silently stop working at either end of the sequence.
      // The focused element is therefore read before the assignments above.
      if (focused === previous && previous.disabled) {
        (next.disabled ? close : next).focus();
      } else if (focused === next && next.disabled) {
        (previous.disabled ? close : previous).focus();
      }
    };

    for (const [index, item] of items.entries()) {
      const opener = item.querySelector<HTMLButtonElement>("[data-panel-open]");
      if (!opener) continue;

      opener.hidden = false;
      opener.addEventListener("click", () => {
        openedAt = index;
        show(index);
        dialog.showModal();
      });
    }

    previous.addEventListener("click", () => show(current - 1));
    next.addEventListener("click", () => show(current + 1));
    close.addEventListener("click", () => dialog.close());

    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(current - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        show(current + 1);
      }
    });

    // Clicking away from the artwork closes, which is what a lightbox is
    // expected to do. The image box fills the stage, so "away" is either the
    // stage's own gutter or the letterbox `object-fit: contain` leaves inside
    // that box, and the second of those has to be measured.
    stage.addEventListener("click", (event) => {
      if (event.target === stage) {
        dialog.close();
        return;
      }

      if (event.target !== image) return;
      if (!isOverArtwork(image, event.clientX, event.clientY)) dialog.close();
    });

    // Someone who paged through the viewer comes back to the panel they
    // finished on rather than the one they opened, so closing does not lose
    // their place. Closing without paging leaves the page exactly as it was.
    dialog.addEventListener("close", () => {
      const item = items[current];
      const opener = item.querySelector<HTMLButtonElement>("[data-panel-open]");

      opener?.focus({ preventScroll: true });

      if (current !== openedAt) {
        item.scrollIntoView({ block: "center", behavior: "auto" });
      }
    });
  }
}
