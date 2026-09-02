/**
 * The reading log's filters.
 *
 * The whole log is in the HTML, so a reader with no JavaScript gets every
 * entry in one list rather than a first page with no way to reach the rest.
 * Filtering is a display concern layered on top of that here, which is why the
 * controls stay hidden until this runs: a control that would do nothing is
 * worse than no control at all.
 *
 * The search box and the dropdowns narrow together rather than replacing each
 * other, so "Ambedkar" and "2020" can be asked as one question.
 */
import {
  inFacetSet,
  logStatusLabel,
  matchesSearch,
  searchTerms,
} from "~/features/book-readings/search";

export function mountReadingLog(): void {
  const controls = document.querySelector<HTMLElement>("[data-log-controls]");
  const input = document.querySelector<HTMLInputElement>("[data-log-search]");
  const status = document.querySelector<HTMLElement>("[data-log-status]");
  const empty = document.querySelector<HTMLElement>("[data-log-empty]");
  const clear = document.querySelector<HTMLButtonElement>("[data-log-clear]");

  if (!controls || !input || !status || !empty || !clear) return;

  /*
   * Each dropdown names the entry attribute it reads, so a fourth one can be
   * added in the component without this file learning about it.
   *
   * Collected by narrowing rather than by a `querySelectorAll` type argument:
   * the Cloudflare runtime types in scope declare their own `Element`, whose
   * `remove()` returns a value, and `HTMLSelectElement` — which overloads
   * `remove(index)` — does not satisfy it. `instanceof` asks the browser the
   * same question without needing the two libraries to agree.
   */
  const facets: HTMLSelectElement[] = [];
  for (const node of document.querySelectorAll("[data-log-facet]")) {
    if (node instanceof HTMLSelectElement) facets.push(node);
  }

  const entries = Array.from(
    document.querySelectorAll<HTMLElement>("[data-log-entry]"),
  );

  if (entries.length === 0) return;

  controls.hidden = false;

  const inEveryFacet = (entry: HTMLElement) =>
    facets.every((select) => {
      const key = select.dataset.logFacet;
      return (
        key === undefined || inFacetSet(select.value, entry.dataset[key] ?? "")
      );
    });

  const isFiltered = () =>
    input.value.trim() !== "" || facets.some((select) => select.value !== "");

  const apply = () => {
    const terms = searchTerms(input.value);
    let visible = 0;

    for (const entry of entries) {
      const matched =
        matchesSearch(entry.dataset.search ?? "", terms) && inEveryFacet(entry);

      entry.hidden = !matched;
      if (matched) visible += 1;
    }

    empty.hidden = visible > 0;
    status.textContent = logStatusLabel(visible, entries.length);
    // Offered only once there is something to clear, so the control appears
    // as the answer to a filter rather than sitting there unexplained.
    clear.hidden = !isFiltered();
  };

  input.addEventListener("input", apply);
  for (const select of facets) select.addEventListener("change", apply);

  clear.addEventListener("click", () => {
    input.value = "";
    for (const select of facets) select.value = "";
    apply();
    // Back to the field a reader would type in next, rather than to a button
    // that has just removed itself from the page.
    input.focus();
  });

  apply();
}
