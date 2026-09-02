/**
 * In-page filtering for an editorial index.
 *
 * The blog and the interventions index used to publish a route per term —
 * `/blog/category/<id>/`, `/interventions/kind/<id>/`. A vocabulary grows, and
 * each new term added a listing that repeated the index it was cut from, so
 * the sitemap filled with near-empty pages nobody had asked for. One index that
 * narrows itself replaces all of them, and the query string keeps a narrowed
 * view linkable.
 *
 * The markup contract is set by `EditorialIndex.astro`:
 *
 * - the root carries `data-index-filter="<query key>"`;
 * - `[data-filter-controls]` wraps the chips and sits with the entries it
 *   filters, so a press changes something the reader can see;
 * - each chip is a `button[data-filter-value]`, where `all` clears the filter;
 * - each card carries `data-filter-term`; the lead band also carries the
 *   attribute for context but is never hidden;
 * - `[data-page-meta]` is the masthead's meta line, which prints the number of
 *   entries on show, worded by `data-count-one` and `data-count-other`;
 * - `[data-filter-list-label]` names the run of cards under the lead.
 */

const ALL_TERMS = "all";

const setHidden = (element: HTMLElement, hidden: boolean) => {
  element.hidden = hidden;
};

const enhanceIndex = (root: HTMLElement) => {
  const key = root.dataset.indexFilter;

  if (!key) {
    return;
  }

  const chips = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-filter-value]"),
  ];
  const entries = [
    ...root.querySelectorAll<HTMLElement>(
      "[data-filter-term]:not([data-filter-lead])",
    ),
  ];
  const count = root.querySelector<HTMLElement>("[data-page-meta]");

  if (chips.length === 0 || entries.length === 0) {
    return;
  }

  // The count changes without anything moving focus, so a reader who is not
  // looking at the list needs it announced. It is only ever a few words.
  count?.setAttribute("aria-live", "polite");

  const apply = (term: string) => {
    let shown = root.querySelector("[data-filter-lead]") ? 1 : 0;

    for (const entry of entries) {
      const matches = term === ALL_TERMS || entry.dataset.filterTerm === term;
      setHidden(entry, !matches);

      if (matches) {
        shown += 1;
      }
    }

    if (count) {
      const noun =
        shown === 1
          ? (root.dataset.countOne ?? "entry")
          : (root.dataset.countOther ?? "entries");
      count.textContent = `${shown} ${noun}`;
    }

    for (const chip of chips) {
      chip.setAttribute(
        "aria-pressed",
        String(chip.dataset.filterValue === term),
      );
    }
  };

  const known = new Set(chips.map((chip) => chip.dataset.filterValue));

  const select = (term: string, pushToUrl: boolean) => {
    apply(term);

    if (!pushToUrl) {
      return;
    }

    const url = new URL(window.location.href);

    if (term === ALL_TERMS) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, term);
    }

    // Replaced rather than pushed. A filter is a way of looking at one page,
    // not a place; pushing would make Back walk chip by chip out of the index
    // instead of returning to wherever the reader came from.
    window.history.replaceState(null, "", url);
  };

  for (const chip of chips) {
    chip.addEventListener("click", () => {
      select(chip.dataset.filterValue ?? ALL_TERMS, true);
    });
  }

  // A shared or bookmarked link opens narrowed. An unrecognised term — a
  // retired category, a typo — falls back to the whole index rather than to an
  // empty one.
  const requested = new URLSearchParams(window.location.search).get(key);
  select(requested && known.has(requested) ? requested : ALL_TERMS, false);
};

export const mountIndexFilters = (): void => {
  document
    .querySelectorAll<HTMLElement>("[data-index-filter]")
    .forEach(enhanceIndex);
};
