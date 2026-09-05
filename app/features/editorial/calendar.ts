import { isUpcoming, type Dated } from "~/lib/collection-policy";

/** Date-only conferences remain current through their effective final day. */
export const isUpcomingConference = (
  conference: Dated & { data: { endDate?: Date } },
): boolean =>
  isUpcoming({
    data: { date: conference.data.endDate ?? conference.data.date },
  });
