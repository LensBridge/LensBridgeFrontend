/**
 * Small pure helpers for the "Add board" and USB stick downloads. Kept out of
 * the components so they can be tested with node --test.
 */

/** Days of content a package may carry; the agent and backend share the 92. */
export const MAX_CONTENT_DAYS = 92;
export const DEFAULT_CONTENT_DAYS = 14;

export function clampDays(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_CONTENT_DAYS;
  return Math.min(MAX_CONTENT_DAYS, n);
}

/** The filename from a Content-Disposition header, or the fallback. */
export function filenameFrom(disposition, fallback) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || '');
  return match?.[1] || fallback;
}

/**
 * What the volunteer at the board does, one step per line. The kit is a zip
 * whose only folder is MusallahBoard/; the board's USB import reads that folder.
 * @param {string} boardName
 * @param {{ kit?: boolean }} [options] false when only a bare .mbu was downloaded
 */
export function volunteerSteps(boardName, { kit = true } = {}) {
  const name = boardName?.trim() || 'this board';
  return [
    kit
      ? 'Unzip the kit onto a USB stick (FAT32 or exFAT), so the stick has a MusallahBoard folder.'
      : 'Copy the file into a MusallahBoard folder on a USB stick (FAT32 or exFAT).',
    `Plug the stick into the board, wait for "Set up as ${name}", remove it.`,
  ];
}

/** Saves a Blob as a download in the browser. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Opens the same steps as a one-page card in a new window and prints it. */
export function printVolunteerCard(boardName) {
  const win = window.open('', '_blank', 'width=600,height=500');
  if (!win) return;
  const items = volunteerSteps(boardName).map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  win.document.write(`<!doctype html><title>Setting up ${escapeHtml(boardName || 'a board')}</title>
<body style="font-family: system-ui, sans-serif; font-size: 18px; margin: 2em; line-height: 1.5">
<h1 style="font-size: 24px">Updating ${escapeHtml(boardName || 'a MusallahBoard')}</h1>
<ol>${items}</ol>
<p style="color:#555">If the screen says something else, take a photo of it and send it to whoever gave you the stick.</p>
</body>`);
  win.document.close();
  win.focus();
  win.print();
}
