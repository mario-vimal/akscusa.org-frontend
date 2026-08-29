/**
 * Shared behaviour for a `<details>` menu.
 *
 * `<details>` is the whole control. It opens from a pointer and from a
 * keyboard with no script at all, and it reports its own expanded state to
 * assistive technology, which is why neither the header dropdown nor the
 * mobile sheet is built out of a button and a hand-written `aria-expanded`.
 *
 * What is left for a script is what a reader expects of a menu and the element
 * does not do on its own: close when attention moves away from it, and, on a
 * device that has a mouse, open when one rests on it.
 */

interface DisclosureOptions {
  /** Stops the page behind a full-width sheet scrolling while it is open. */
  lockScroll?: boolean;
  /** Swapped onto the summary, so its purpose is announced in both states. */
  labels?: { closed: string; open: string };
  /**
   * Opens the menu when a mouse rests on it, as a shortcut over clicking.
   *
   * It is only ever a shortcut. The click and the keyboard remain the control,
   * because hover cannot be the way in: a touch screen has no hover, and a
   * reader on a keyboard never produces one.
   */
  openOnHover?: boolean;
}

/**
 * How long a mouse has to rest before the menu opens, and how long it may be
 * away before the menu closes.
 *
 * The first delay is what stops the panel flashing open as a pointer crosses
 * the item on its way along the bar. The second is the grace a reader needs to
 * cut the corner between the trigger and the panel below it.
 */
const OPEN_DELAY_MS = 110;
const CLOSE_DELAY_MS = 160;

export const enhanceDisclosure = (
  menu: HTMLDetailsElement,
  { lockScroll = false, labels, openOnHover = false }: DisclosureOptions = {},
): void => {
  const summary = menu.querySelector("summary");

  menu.addEventListener("toggle", () => {
    if (lockScroll) {
      document.documentElement.style.overflow = menu.open ? "hidden" : "";
    }

    if (labels) {
      summary?.setAttribute(
        "aria-label",
        menu.open ? labels.open : labels.closed,
      );
    }
  });

  // Pointer down rather than click: dismissing a menu should not also activate
  // whatever happens to be underneath the pointer.
  document.addEventListener("pointerdown", (event) => {
    if (
      menu.open &&
      event.target instanceof Node &&
      !menu.contains(event.target)
    ) {
      menu.open = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      summary?.focus();
    }
  });

  // Tabbing past the last link would otherwise leave the menu standing open
  // behind the reader. A null `relatedTarget` is ignored on purpose: focus
  // falling back to the document is what a tap on the sheet's own padding
  // produces, and that is not a reason to close it.
  menu.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;

    if (menu.open && next instanceof Node && !menu.contains(next)) {
      menu.open = false;
    }
  });

  if (!openOnHover) {
    return;
  }

  // Asked of the device rather than assumed from the pointer that arrived. A
  // touch screen dispatches a `mouse` pointer event after a tap, which would
  // reopen the menu the tap had just closed.
  const hasHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  let timer = 0;

  const schedule = (open: boolean, delay: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      // A reader who tabbed into the menu and then moved the mouse elsewhere
      // still has their place in it; taking it away would lose their focus.
      if (!open && menu.contains(document.activeElement)) {
        return;
      }

      menu.open = open;
    }, delay);
  };

  menu.addEventListener("pointerenter", (event) => {
    if (hasHover.matches && event.pointerType === "mouse") {
      schedule(true, OPEN_DELAY_MS);
    }
  });

  menu.addEventListener("pointerleave", (event) => {
    if (hasHover.matches && event.pointerType === "mouse") {
      schedule(false, CLOSE_DELAY_MS);
    }
  });

  // A click is still a click. Without this the pending hover would reopen a
  // menu the reader had just closed, or close one they had just opened.
  summary?.addEventListener("click", () => window.clearTimeout(timer));
};

/** Applies the same behaviour to every disclosure matching a selector. */
export const enhanceDisclosures = (
  selector: string,
  options?: DisclosureOptions,
): void => {
  document
    .querySelectorAll<HTMLDetailsElement>(selector)
    .forEach((menu) => enhanceDisclosure(menu, options));
};
