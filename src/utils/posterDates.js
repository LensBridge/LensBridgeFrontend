/**
 * Poster start and end dates, as an editor means them: whole days in the
 * admin's own time zone, the end date included.
 *
 * The backend stores an instant range [startTime, endTime) and each day of a
 * board's content package shows the posters overlapping that day (in the
 * board's zone). Sending the bare dates as UTC midnight, as this used to, put a
 * poster on the evening before its start date and took it off a day early in
 * any zone west of UTC. An editor and the boards share a zone, so local days
 * line up with the board's days.
 *
 * Posters saved before that still carry UTC-midnight instants, which the
 * editor shows a day early here. Saving one must not rewrite its schedule as a
 * side effect, so an edit sends only the dates the admin actually changed
 * (scheduleChanges); the PATCH leaves an omitted instant as it is.
 */

/** 'yyyy-mm-dd' -> a Date at local midnight, or null. */
function localMidnight(day) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** A Date -> its 'yyyy-mm-dd' day in the local zone. */
export function localDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Start date -> startTime: the start of that day. */
export function startDateToIso(day) {
  return localMidnight(day)?.toISOString();
}

/** End date (included) -> endTime: the start of the next day, which the range excludes. */
export function endDateToIso(day) {
  const start = localMidnight(day);
  if (!start) return undefined;
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1).toISOString();
}

/** startTime -> the start date the editor shows. */
export function isoToStartDate(iso) {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? localDay(date) : '';
}

/** endTime (excluded) -> the last day the poster shows. */
export function isoToEndDate(iso) {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? localDay(new Date(date.getTime() - 1)) : '';
}

/** Editor dates -> the instants a new poster is created with. */
export function scheduleToInstants({ startDate, endDate }) {
  return { startTime: startDateToIso(startDate), endTime: endDateToIso(endDate) };
}

/**
 * The instants an edit should send: only for a date that differs from what
 * the editor showed when it opened (`shown`), so an untouched date keeps its
 * stored instant exactly, legacy or not. A blank or malformed date is never
 * sent. Without `shown`, every valid date is sent.
 */
export function scheduleChanges(edited, shown) {
  const changes = {};
  const { startTime, endTime } = scheduleToInstants(edited);
  if (startTime && edited.startDate !== shown?.startDate) changes.startTime = startTime;
  if (endTime && edited.endDate !== shown?.endDate) changes.endTime = endTime;
  return changes;
}

/** Whether a poster with these editor dates is showing on `now`'s day. */
export function isShowing(startDate, endDate, now = new Date()) {
  const today = localDay(now);
  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;
  return true;
}
