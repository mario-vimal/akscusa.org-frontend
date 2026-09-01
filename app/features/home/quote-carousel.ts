/* The quote carousel. */
export function mountQuoteCarousels(): void {
  const carousel = document.querySelector<HTMLElement>("[data-quote-carousel]");

  if (carousel) {
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
    const status = carousel.querySelector<HTMLElement>(
      "[data-carousel-status]",
    );
    const slides = Array.from(
      carousel.querySelectorAll<HTMLElement>("[data-carousel-slide]"),
    );

    if (
      viewport &&
      controls &&
      previous &&
      next &&
      toggle &&
      pauseIcon &&
      playIcon &&
      status &&
      slides.length > 1
    ) {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
      const interval = 6_000;
      let current = 0;
      let timer: number | undefined;
      let userPaused = reducedMotion.matches;
      let interactionPaused = false;
      let scrollFrame: number | undefined;

      controls.hidden = false;

      const setToggleState = () => {
        const playing = !userPaused && !reducedMotion.matches;
        toggle.ariaLabel = playing ? "Pause quotations" : "Play quotations";
        pauseIcon.classList.toggle("hidden", !playing);
        playIcon.classList.toggle("hidden", playing);
      };

      const updatePosition = () => {
        const nearest = slides.reduce(
          (best, slide, index) => {
            const distance = Math.abs(slide.offsetLeft - viewport.scrollLeft);
            return distance < best.distance ? { index, distance } : best;
          },
          { index: current, distance: Number.POSITIVE_INFINITY },
        );
        current = nearest.index;
      };

      const announce = () => {
        const author =
          slides[current].querySelector("figcaption p")?.textContent?.trim() ??
          "quotation";
        status.textContent = `Showing quotation ${current + 1} of ${slides.length}, ${author}.`;
      };

      const goTo = (index: number, shouldAnnounce = false) => {
        current = (index + slides.length) % slides.length;
        viewport.scrollTo({
          left: slides[current].offsetLeft,
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
          document.hidden
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
          ? "Automatic quotation rotation paused."
          : "Automatic quotation rotation started.";
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

      // Keep the active slide aligned when a phone rotates or the browser is
      // resized. The slide width changes with the viewport, but its index does
      // not.
      const resizeObserver = new ResizeObserver(() => {
        viewport.scrollTo({
          left: slides[current].offsetLeft,
          behavior: "auto",
        });
      });
      resizeObserver.observe(viewport);

      setToggleState();
      startTimer();
    }
  }
}
