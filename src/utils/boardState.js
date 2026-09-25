/**
 * The board's report of itself (`device.board`, sent with every heartbeat by
 * agent 0.3.0 and later; see the agent's docs/architecture.md, "Board report"),
 * turned into what the console shows: plain sentences and the few issues that
 * need someone's attention.
 *
 *   { appVersion,
 *     content: { firstDay, lastDay, createdAt, source, installedAt, daysRemaining, staleDays },
 *     updates: { available: [{ type, version, description }], installTime, installAt, installing },
 *     lastAgentUpdate: { from, to, at, status: 'ok' | 'rolled-back' | 'refused', message },
 *     clock: { source: 'ntp' | 'rtc' | 'uploader' | 'starting' | 'unverified', trusted },
 *     syncError, error }
 */

const SOURCE_LABELS = {
  sync: 'synced from LensBridge',
  usb: 'from a USB stick',
  upload: 'uploaded from a laptop or phone',
  cli: 'installed from the command line'
};

const CLOCK_LABELS = {
  ntp: 'Set from the internet',
  rtc: 'Kept by the hardware clock',
  uploader: 'Set from a laptop or phone since the board started',
  starting: 'Checking (the board just started)',
  unverified: 'Not confirmed since the board started: prayer times may be wrong'
};

/** Content ending this many days from now or sooner is worth a warning. */
const CONTENT_LOW_DAYS = 2;

/** A report this old says so: an offline board's report stops at its last heartbeat. */
const REPORT_OLD_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" today in `timezone` (the board's), or the viewer's own. */
function todayIn(timezone, now) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone || undefined,
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Days of content left, or days since it ran out, worked out from lastDay and
 * today rather than taken from the report: a board offline for a week last
 * reported "6 days left", and that is no longer true.
 */
export function contentDays(content, now = new Date()) {
  if (!content?.lastDay) return { daysRemaining: content?.daysRemaining ?? 0, staleDays: content?.staleDays ?? 0 };
  const diff = Math.round(
    (Date.parse(`${content.lastDay}T00:00:00Z`) - Date.parse(`${todayIn(content.timezone, now)}T00:00:00Z`)) / DAY_MS
  );
  return diff >= 0 ? { daysRemaining: diff, staleDays: 0 } : { daysRemaining: 0, staleDays: -diff };
}

/** "Oct 1" for a board-local "2026-10-01". */
export function formatDay(day) {
  if (!day) return '';
  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * "Thu, Sep 25, 11:00 PM" for an RFC 3339 time, read as the board's own wall
 * clock (the offset it carries), not the viewer's: "installs at 11:00 PM" means
 * the board's 11 PM wherever the admin is.
 */
export function formatBoardTime(rfc3339) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(rfc3339 || '');
  if (!m) return rfc3339 || '';
  const wall = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  return wall.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC'
  });
}

/** One line about the installed content. */
export function describeContent(content, now = new Date()) {
  if (!content) return 'No content installed';
  const range = `${formatDay(content.firstDay)} to ${formatDay(content.lastDay)}`;
  const { daysRemaining: left, staleDays } = contentDays(content, now);
  if (staleDays > 0) {
    return `${range}: ran out ${staleDays} day${staleDays === 1 ? '' : 's'} ago`;
  }
  return `${range} (${left} more day${left === 1 ? '' : 's'})`;
}

export function contentSource(content) {
  return SOURCE_LABELS[content?.source] || '';
}

/** One line about software waiting for the install window, or null. */
export function describeUpdates(updates) {
  const available = updates?.available ?? [];
  if (!available.length) return null;
  const what = available.map((u) => u.description).join(' and ');
  if (updates.installing) return `Installing ${what} now`;
  return updates.installAt ? `${what}, installs ${formatBoardTime(updates.installAt)} (board time)` : what;
}

/** The last agent self-update, in a sentence, with how it went. */
export function describeAgentUpdate(u) {
  if (!u) return null;
  switch (u.status) {
    case 'ok':
      return { level: 'ok', text: `Updated from ${u.from} to ${u.to}` };
    case 'rolled-back':
      return { level: 'danger', text: `Agent ${u.to} failed to start, so the board went back to ${u.from}. It will not be retried.` };
    case 'refused':
      return { level: 'warning', text: `Agent ${u.to || 'update'} could not be installed on this board` };
    default:
      return { level: 'warning', text: u.message || u.status };
  }
}

export function describeClock(clock) {
  if (!clock) return null;
  return { level: clock.trusted === false ? 'danger' : 'ok', text: CLOCK_LABELS[clock.source] || clock.source };
}

/**
 * What needs someone's attention, most serious first, as short labels for the
 * device list and the device page header. Empty when the board is fine or has
 * not reported.
 */
/**
 * What the portal can say about software updates: waiting ones, a failing
 * check, or updates being off. Null when there is nothing to say.
 */
export function updateCheckProblem(updates) {
  if (!updates) return null;
  if (updates.autoUpdate === false) return 'Automatic updates are off on this board';
  if (updates.lastCheckError) return `Update check failing: ${updates.lastCheckError}`;
  return null;
}

export function boardIssues(board, { reportAt = null, now = new Date() } = {}) {
  if (!board) return [];
  const issues = [];
  if (!board.appVersion) issues.push({ level: 'danger', label: 'No board app' });
  if (board.error) issues.push({ level: 'danger', label: 'Content unreadable' });
  const c = board.content;
  if (!c && !board.error) issues.push({ level: 'danger', label: 'No content' });
  const days = contentDays(c, now);
  if (c && days.staleDays > 0) issues.push({ level: 'danger', label: `Content ran out ${days.staleDays}d ago` });
  else if (c && days.daysRemaining <= CONTENT_LOW_DAYS) issues.push({ level: 'warning', label: `Content ends in ${days.daysRemaining}d` });
  if (board.clock?.trusted === false) issues.push({ level: 'danger', label: 'Clock unconfirmed' });
  if (board.lastAgentUpdate?.status === 'rolled-back') issues.push({ level: 'danger', label: 'Agent update rolled back' });
  if (board.lastAgentUpdate?.status === 'refused') issues.push({ level: 'warning', label: 'Agent update refused' });
  if (board.syncError) issues.push({ level: 'warning', label: 'Sync failing' });
  if (board.updates?.lastCheckError && board.updates?.autoUpdate !== false) {
    issues.push({ level: 'warning', label: 'Update check failing' });
  }
  const age = reportAt ? now.getTime() - Date.parse(reportAt) : 0;
  if (age > REPORT_OLD_MS) issues.push({ level: 'info', label: `Report ${Math.floor(age / DAY_MS)}d old` });
  if (board.updates?.available?.length) issues.push({ level: 'info', label: 'Update waiting' });
  return issues;
}
