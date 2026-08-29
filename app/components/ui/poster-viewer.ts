import { isOverArtwork } from "~/lib/image-viewer";

/*
 * One poster viewer for the whole page.
 *
 * Astro bundles a component's script once per page however many times the
 * component renders, so a single dialog is built lazily and every poster on the
 * page opens into it. The markup is created here rather than authored in the
 * component because a page with no poster should not carry a hidden dialog.
 */
export function mountPosterViewer(): void {
  // One viewer serves every poster on the page. Astro includes a component's
  // script once no matter how many times the component is used, so this runs
  // a single time and binds by delegation.
  interface PosterViewer {
    dialog: HTMLDialogElement;
    image: HTMLImageElement;
    caption: HTMLElement;
  }

  let viewer: PosterViewer | null = null;
  let opener: HTMLElement | null = null;

  function buildViewer(): PosterViewer {
    const dialog = document.createElement("dialog");
    dialog.className = "poster-viewer";
    dialog.setAttribute("aria-label", "Poster viewer");

    const bar = document.createElement("div");
    bar.className = "poster-viewer__bar";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "poster-viewer__close";
    close.textContent = "Close";
    bar.appendChild(close);

    const stage = document.createElement("div");
    stage.className = "poster-viewer__stage";

    const image = document.createElement("img");
    image.className = "poster-viewer__image";
    image.decoding = "async";
    stage.appendChild(image);

    const caption = document.createElement("p");
    caption.className = "poster-viewer__caption";

    dialog.appendChild(bar);
    dialog.appendChild(stage);
    dialog.appendChild(caption);
    document.body.appendChild(dialog);

    close.addEventListener("click", () => dialog.close());

    // Close on any click that is not the close button or the poster itself.
    //
    // The image box fills the stage and the artwork is letterboxed inside it,
    // so a click in the empty margin still reports the image as its target.
    // Testing the target alone would make the whole stage inert; the visible
    // artwork has to be measured instead.
    dialog.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      if (target && close.contains(target)) return;
      if (
        target === image &&
        isOverArtwork(image, event.clientX, event.clientY)
      )
        return;
      dialog.close();
    });

    // `showModal` moves focus into the dialog; put it back where it was so
    // the reader returns to the poster they opened rather than the page top.
    dialog.addEventListener("close", () => {
      image.removeAttribute("src");
      opener?.focus();
      opener = null;
    });

    return { dialog, image, caption };
  }

  function open(trigger: HTMLAnchorElement) {
    viewer ??= buildViewer();
    const figure = trigger.closest("figure");
    const source = figure?.querySelector<HTMLImageElement>(".poster__image");

    viewer.image.src = trigger.href;
    viewer.image.alt = source?.alt ?? "";
    viewer.caption.textContent = trigger.dataset.posterCaption ?? "";

    opener = trigger;
    viewer.dialog.showModal();
  }

  function ready() {
    const triggers =
      document.querySelectorAll<HTMLAnchorElement>("[data-poster-open]");
    if (triggers.length === 0) return;

    for (const trigger of triggers) {
      // Marks the control as upgraded, so the zoom cursor only appears once
      // the click actually opens the viewer instead of leaving the page.
      trigger.dataset.posterReady = "";
    }

    document.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      const trigger = target?.closest<HTMLAnchorElement>("[data-poster-open]");
      if (!trigger) return;
      // Leave modified clicks alone: they are a deliberate request for a tab.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      open(trigger);
    });
  }

  ready();
  document.addEventListener("astro:after-swap", ready);
}
