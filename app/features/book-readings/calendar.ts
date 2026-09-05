import {
  byNewestFirst,
  bySoonestFirst,
  type Dated,
  type Identified,
} from "~/lib/collection-policy";
import { isoPacificDate } from "~/lib/dates";

/** The circle keeps a session upcoming for its entire Pacific calendar day. */
export const isUpcomingReading = (reading: Dated): boolean =>
  isoPacificDate(reading.data.date) >= isoPacificDate(new Date());

/** The soonest session still to come, or the last held when none is scheduled. */
export const currentReading = <R extends Dated & Identified>(
  readings: readonly R[],
): R | undefined =>
  readings.filter(isUpcomingReading).sort(bySoonestFirst)[0] ??
  [...readings].sort(byNewestFirst)[0];
