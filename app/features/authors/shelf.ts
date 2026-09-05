import type { BookWithReadings } from "~/features/books/queries/books";
import { byId, byNewestFirst } from "~/lib/collection-policy";

const titles = new Intl.Collator("en", { sensitivity: "base" });

const latestSessionOn = (entry: BookWithReadings): Date | undefined =>
  entry.readings.reduce<Date | undefined>(
    (latest, reading) =>
      !latest || reading.data.date > latest ? reading.data.date : latest,
    undefined,
  );

/** Latest session record first, then unscheduled books alphabetically. */
export function byLatestSession(
  a: BookWithReadings,
  b: BookWithReadings,
): number {
  const left = latestSessionOn(a);
  const right = latestSessionOn(b);

  if (left === undefined && right === undefined) {
    return (
      titles.compare(a.book.data.title, b.book.data.title) ||
      byId(a.book, b.book)
    );
  }

  if (left === undefined) return 1;
  if (right === undefined) return -1;

  return byNewestFirst(
    { id: a.book.id, data: { date: left } },
    { id: b.book.id, data: { date: right } },
  );
}
