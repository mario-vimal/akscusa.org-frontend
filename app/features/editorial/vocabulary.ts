import { byId } from "~/lib/collection-policy";

export interface Term {
  /** The entry's filename, which is what an entry stores. */
  id: string;
  label: string;
  description?: string;
}

const labels = new Intl.Collator("en");

export const byTermLabel = (a: Term, b: Term): number =>
  labels.compare(a.label, b.label) || byId(a, b);

/** A removed vocabulary entry keeps its stored ID visible rather than failing. */
export function termLabels(terms: readonly Term[]): (id: string) => string {
  const labels = new Map(terms.map((term) => [term.id, term.label]));
  return (id) => labels.get(id) ?? id;
}

/** Only used terms are offered as filters, retaining the vocabulary's order. */
export function termsInUse<E>(
  terms: readonly Term[],
  entries: readonly E[],
  termOf: (entry: E) => string | undefined,
): Term[] {
  const used = new Set(entries.map(termOf));
  return terms.filter((term) => used.has(term.id));
}
