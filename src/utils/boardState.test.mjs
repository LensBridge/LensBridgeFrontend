/**
 * Pins how a board's report reads in the console. The failure mode is quiet:
 * a board whose content has run out, or whose clock is unconfirmed, looking
 * fine in the device list.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardIssues, describeContent, describeUpdates, describeAgentUpdate, formatBoardTime } from './boardState.js';

const content = { firstDay: '2026-09-25', lastDay: '2026-10-01', daysRemaining: 6, staleDays: 0, source: 'usb' };

test('a healthy board has no issues', () => {
  assert.deepEqual(boardIssues({ appVersion: '2.2.0', content, clock: { source: 'ntp', trusted: true } }), []);
  assert.deepEqual(boardIssues(null), []);
});

test('problems are listed most serious first', () => {
  const labels = boardIssues({
    content: { ...content, daysRemaining: 0, staleDays: 3 },
    clock: { source: 'unverified', trusted: false },
    lastAgentUpdate: { status: 'rolled-back', from: '0.2.1', to: '0.3.0' },
    syncError: 'no route',
    updates: { available: [{ description: 'board app 2.3.0' }] }
  }).map((i) => `${i.level}:${i.label}`);
  assert.deepEqual(labels, [
    'danger:Content ran out 3d ago',
    'danger:Clock unconfirmed',
    'danger:Agent update rolled back',
    'warning:Sync failing',
    'info:Update waiting'
  ]);
});

test('content running low is a warning', () => {
  assert.deepEqual(boardIssues({ content: { ...content, daysRemaining: 1 } }).map((i) => i.label), ['Content ends in 1d']);
});

test('content reads as a range with days left', () => {
  assert.equal(describeContent(content), 'Sep 25 to Oct 1 (6 more days)');
  assert.equal(describeContent({ ...content, staleDays: 1 }), 'Sep 25 to Oct 1: ran out 1 day ago');
  assert.equal(describeContent(null), 'No content installed');
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
