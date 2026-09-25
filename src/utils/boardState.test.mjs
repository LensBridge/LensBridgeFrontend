/**
 * Pins how a board's report reads in the console. The failure mode is quiet:
 * a board whose content has run out, or whose clock is unconfirmed, looking
 * fine in the device list.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boardIssues, contentDays, describeContent, describeUpdates, describeAgentUpdate,
  formatBoardTime, updateCheckProblem,
} from './boardState.js';

// Midday in Toronto, 25 September 2026.
const now = new Date('2026-09-25T16:00:00Z');
const content = {
  firstDay: '2026-09-25', lastDay: '2026-10-01', timezone: 'America/Toronto',
  daysRemaining: 6, staleDays: 0, source: 'usb',
};
const healthy = { appVersion: '2.2.0', content, clock: { source: 'ntp', trusted: true } };

test('a healthy board has no issues', () => {
  assert.deepEqual(boardIssues(healthy, { now }), []);
  assert.deepEqual(boardIssues(null), []);
});

test('problems are listed most serious first', () => {
  const labels = boardIssues({
    content: { ...content, lastDay: '2026-09-22' },
    clock: { source: 'unverified', trusted: false },
    lastAgentUpdate: { status: 'rolled-back', from: '0.2.1', to: '0.3.0' },
    syncError: 'no route',
    updates: { available: [{ description: 'board app 2.3.0' }], autoUpdate: true, lastCheckError: 'dns' },
  }, { now }).map((i) => `${i.level}:${i.label}`);
  assert.deepEqual(labels, [
    'danger:No board app',
    'danger:Content ran out 3d ago',
    'danger:Clock unconfirmed',
    'danger:Agent update rolled back',
    'warning:Sync failing',
    'warning:Update check failing',
    'info:Update waiting',
  ]);
});

test('days left come from lastDay and today, not the report', () => {
  // Reported "6 days left" a week ago; it has since run out.
  const later = new Date('2026-10-03T16:00:00Z');
  assert.deepEqual(contentDays(content, later), { daysRemaining: 0, staleDays: 2 });
  assert.deepEqual(contentDays(content, now), { daysRemaining: 6, staleDays: 0 });
  // Just after midnight in Toronto is still the previous day in UTC terms.
  assert.deepEqual(contentDays(content, new Date('2026-10-02T03:30:00Z')), { daysRemaining: 0, staleDays: 0 });
});

test('content running low is a warning', () => {
  assert.deepEqual(
    boardIssues({ ...healthy, content: { ...content, lastDay: '2026-09-26' } }, { now }).map((i) => i.label),
    ['Content ends in 1d']
  );
});

test('an old report says so', () => {
  const labels = boardIssues(healthy, { reportAt: '2026-09-21T12:00:00Z', now }).map((i) => i.label);
  assert.deepEqual(labels, ['Report 4d old']);
});

test('content reads as a range with days left', () => {
  assert.equal(describeContent(content, now), 'Sep 25 to Oct 1 (6 more days)');
  assert.equal(describeContent(content, new Date('2026-10-02T16:00:00Z')), 'Sep 25 to Oct 1: ran out 1 day ago');
  assert.equal(describeContent(null), 'No content installed');
});

test('update checks: off, failing, or fine', () => {
  assert.equal(updateCheckProblem({ autoUpdate: false }), 'Automatic updates are off on this board');
  assert.equal(updateCheckProblem({ autoUpdate: true, lastCheckError: 'dns' }), 'Update check failing: dns');
  assert.equal(updateCheckProblem({ autoUpdate: true, lastCheckAt: '2026-09-25T12:00:00Z' }), null);
});

test('install times are the board\'s wall clock, not the viewer\'s', () => {
  assert.equal(formatBoardTime('2026-09-25T23:00:00-04:00'), 'Fri, Sep 25, 11:00 PM');
  assert.match(
    describeUpdates({ available: [{ description: 'board app 2.3.0' }], installAt: '2026-09-25T23:00:00-04:00' }),
    /^board app 2\.3\.0, installs Fri, Sep 25, 11:00 PM \(board time\)$/
  );
  assert.equal(describeUpdates({ available: [] }), null);
});

test('a rolled back agent update says so plainly', () => {
  const r = describeAgentUpdate({ status: 'rolled-back', from: '0.2.1', to: '0.3.0' });
  assert.equal(r.level, 'danger');
  assert.match(r.text, /0\.3\.0 failed to start, so the board went back to 0\.2\.1/);
});
