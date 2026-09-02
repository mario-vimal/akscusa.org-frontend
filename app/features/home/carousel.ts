/**
 * The behaviour behind a rotating band: the quotations and the shelf of books
 * the circle has read.
 *
 * Written once because the two differ only in what they are called. Everything
 * that varies is read off the markup, so a second carousel is a section with
 * the right `data-carousel-*` attributes rather than another copy of this file.
 *
 * The markup is a scroll-snapping row that already works without JavaScript.
 * This adds the controls, the rotation, and the live region; it never creates a
 * slide, so a reader who never gets the script still gets the whole list.
 *
 * Attributes on the root:
 *   data-carousel            marks the carousel
 *   data-carousel-noun       singular, for "Showing quotation 2 of 5"
 *   data-carousel-rotation   what the play/pause control acts on, for
 *                            "Pause quotations" or "Pause the shelf"
 *   data-carousel-interval   milliseconds between slides, default 6000
 */

const INTERVAL = 6_000;

function mount(carousel: HTMLElement): void {
  // Every section that has a carousel asks for the carousels to be mounted, so
  // a page with two of them runs this twice. Without the flag the second pass
  // would give each carousel a second interval timer and it would advance two
  // slides at a time.
  if (carousel.dataset.carouselReady !== undefined) return;
  carousel.dataset.carouselReady = "";

  const viewport = carousel.querySelector<HTMLElement>(
    "[data-carousel-viewport]",
  );
  const controls = carousel.querySelector<HTMLElement>(
    "[data-carousel-controls]",
  );
  const previous = carousel.querySelector<HTMLButtonElement>(
    "[data-carousel-previous]",
  );
  const next = carousel.querySelector<HTMLButtonElement>(
    "[data-carousel-next]",
  );
  const toggle = carousel.querySelector<HTMLButtonElement>(
    "[data-carousel-toggle]",
  );
  const pauseIcon = carousel.querySelector<SVGElement>(
    "[data-carousel-pause-icon]",
  );
  const playIcon = carousel.querySelector<SVGElement>(
    "[data-carousel-play-icon]",
  );
  const status = carousel.querySelector<HTMLElement>("[data-carousel-status]");
  const slides = Array.from(
    carousel.querySelectorAll<HTMLElement>("[data-carousel-slide]"),
  );

  if (
    !viewport ||
    !controls ||
    !previous ||
    !next ||
    !toggle ||
    !pauseIcon ||
    !playIcon ||
    !status ||
    slides.length < 2
  ) {
    return;
  }

  const noun = carousel.dataset.carouselNoun ?? "item";
  const rotation = carousel.dataset.carouselRotation ?? `${noun}s`;
  const interval = Number(carousel.dataset.carouselInterval) || INTERVAL;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = 0;
  let timer: number | undefined;
  let userPaused = reducedMotion.matches;
  let interactionPaused = false;
  let scrollFrame: number | undefined;

  /*
   * A slide's distance from the start of the row. Measured against the first
   * slide rather than taken raw, because `offsetLeft` is relative to whichever
   * ancestor happens to be positioned, which is not necessarily the viewport.
   */
  const offsetOf = (index: number) =>
    slides[index].offsetLeft - slides[0].offsetLeft;

  const overflows = () => viewport.scrollWidth - viewport.clientWidth > 1;

  const setToggleState = () => {
    const playing = !userPaused && !reducedMotion.matches;
    toggle.ariaLabel = playing ? `Pause ${rotation}` : `Play ${rotation}`;
    pauseIcon.classList.toggle("hidden", !playing);
    playIcon.classList.toggle("hidden", playing);
  };

  const updatePosition = () => {
    /*
     * At the end of the row the active slide is the last one, whatever its
     * own start offset is. A band showing several slides at once cannot bring
     * the last of them to the left edge, so measuring by nearest start would
     * report the second to last and the rotation would announce the wrong
     * book and refuse to wrap.
     */
    if (
      viewport.scrollLeft >=
      viewport.scrollWidth - viewport.clientWidth - 1
    ) {
      current = slides.length - 1;
      return;
    }

    const nearest = slides.reduce(
      (best, slide, index) => {
        const distance = Math.abs(
          slide.offsetLeft - slides[0].offsetLeft - viewport.scrollLeft,
        );
        return distance < best.distance ? { index, distance } : best;
      },
      { index: current, distance: Number.POSITIVE_INFINITY },
    );
    current = nearest.index;
  };

  const announce = () => {
    const label = slides[current]
      .querySelector("[data-carousel-label]")
      ?.textContent?.trim();
    const position = `Showing ${noun} ${current + 1} of ${slides.length}`;
    status.textContent = label ? `${position}, ${label}.` : `${position}.`;
  };

  /*
   * A band that shows several slides at once cannot bring the last of them to
   * the left edge, so the scroll is clamped to the end of the row and the
   * wrap happens once the row is already there. Wrapping at `slides.length - 1`
   * instead would leave the rotation pushing against a scroll that cannot
   * move; skipping the unalignable slides would mean never showing the last
   * one whole. Where one slide fills the viewport neither clamp does anything,
   * which is the quotations' behaviour unchanged.
   */
  const goTo = (index: number, shouldAnnounce = false) => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    const last = slides.length - 1;
    const atEnd = viewport.scrollLeft >= max - 1;
    const wanted = index > current && atEnd ? 0 : index;

    current = wanted > last ? 0 : wanted < 0 ? last : wanted;
    viewport.scrollTo({
      left: Math.min(offsetOf(current), max),
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
    if (shouldAnnounce) announce();
  };

  const stopTimer = () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };

  const startTimer = () => {
    stopTimer();
    if (
      userPaused ||
      interactionPaused ||
      reducedMotion.matches ||
      document.hidden ||
      !overflows()
    ) {
      return;
    }

    timer = window.setInterval(() => goTo(current + 1), interval);
  };

  previous.addEventListener("click", () => {
    goTo(current - 1, true);
    startTimer();
  });

  next.addEventListener("click", () => {
    goTo(current + 1, true);
    startTimer();
  });

  toggle.addEventListener("click", () => {
    userPaused = !userPaused;
    setToggleState();
    startTimer();
    status.textContent = userPaused
      ? `Automatic ${noun} rotation paused.`
      : `Automatic ${noun} rotation started.`;
  });

  viewport.addEventListener("scroll", () => {
    if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
    scrollFrame = window.requestAnimationFrame(updatePosition);
  });

  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(current - 1, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(current + 1, true);
    } else {
      return;
    }
    startTimer();
  });

  carousel.addEventListener("pointerenter", () => {
    interactionPaused = true;
    stopTimer();
  });

  carousel.addEventListener("pointerleave", () => {
    interactionPaused = false;
    startTimer();
  });

  carousel.addEventListener("focusin", () => {
    interactionPaused = true;
    stopTimer();
  });

  carousel.addEventListener("focusout", (event) => {
    if (
      event.relatedTarget instanceof Node &&
      carousel.contains(event.relatedTarget)
    ) {
      return;
    }
    interactionPaused = false;
    startTimer();
  });

  document.addEventListener("visibilitychange", startTimer);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) userPaused = true;
    setToggleState();
    startTimer();
  });

  /*
   * Keep the active slide aligned when a phone rotates or the browser is
   * resized. The slide width changes with the viewport, but its index does
   * not — except that a row which now fits is also a row whose controls have
   * nothing left to do.
   */
  const resizeObserver = new ResizeObserver(() => {
    controls.hidden = !overflows();
    viewport.scrollTo({
      left: Math.min(
        offsetOf(current),
        viewport.scrollWidth - viewport.clientWidth,
      ),
      behavior: "auto",
    });
    startTimer();
  });
  resizeObserver.observe(viewport);

  controls.hidden = !overflows();
  setToggleState();
  startTimer();
}

/** Wires up every carousel on the page. */
export function mountCarousels(root: ParentNode = document): void {
  for (const carousel of root.querySelectorAll<HTMLElement>(
    "[data-carousel]",
  )) {
    mount(carousel);
  }
}
