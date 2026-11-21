/**
 * Poster dates are whole local days with the end date included. Run with
 * TZ=America/Toronto (npm test sets it) so "local" is a zone west of UTC, where
 * the old UTC-midnight conversion was a day off.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  endDateToIso, isoToEndDate, isoToStartDate, isShowing, scheduleChanges, scheduleToInstants, startDateToIso
} from './posterDates.js';

test('the start date begins at local midnight', () => {
  assert.equal(startDateToIso('2026-11-01'), '2026-11-01T04:00:00.000Z');
});

test('the end date is included: the range ends at the next local midnight', () => {
  assert.equal(endDateToIso('2026-11-20'), '2026-11-21T05:00:00.000Z');
});

test('dates round-trip through the backend instants', () => {
  assert.equal(isoToStartDate(startDateToIso('2026-11-01')), '2026-11-01');
  assert.equal(isoToEndDate(endDateToIso('2026-11-20')), '2026-11-20');
  // Across the DST change on 2026-11-01.
  assert.equal(isoToEndDate(endDateToIso('2026-10-31')), '2026-10-31');
});

test('blank or malformed dates are left out', () => {
  assert.equal(startDateToIso(''), undefined);
  assert.equal(endDateToIso('20/11/2026'), undefined);
  assert.equal(isoToEndDate(null), '');
});

test('a poster shows on its first and last day and not after', () => {
  assert.equal(isShowing('2026-11-01', '2026-11-20', new Date(2026, 10, 20, 23, 59)), true);
  assert.equal(isShowing('2026-11-01', '2026-11-20', new Date(2026, 10, 21, 0, 1)), false);
  assert.equal(isShowing('2026-11-01', '2026-11-20', new Date(2026, 9, 31, 23, 0)), false);
});

test('a new poster runs whole local days, the end date included', () => {
  assert.deepEqual(scheduleToInstants({ startDate: '2026-11-20', endDate: '2026-11-20' }), {
    startTime: '2026-11-20T05:00:00.000Z',
    endTime: '2026-11-21T05:00:00.000Z'
  });
});

// A poster saved before the local-day fix, as UTC midnight: the editor shows it
// a day early here, and saving must not turn that back into new instants.
const legacy = { startTime: '2026-11-20T00:00:00.000Z', endTime: '2026-11-27T00:00:00.000Z' };
const shown = { startDate: isoToStartDate(legacy.startTime), endDate: isoToEndDate(legacy.endTime) };
/** The stored instants after the PATCH: an omitted field is left as it is. */
const saved = (edited) => ({ ...legacy, ...scheduleChanges(edited, shown) });

test('a title-only edit keeps a legacy poster\'s instants exactly', () => {
  assert.deepEqual(shown, { startDate: '2026-11-19', endDate: '2026-11-26' });
  assert.deepEqual(scheduleChanges({ title: 'Renamed', ...shown }, shown), {});
  assert.deepEqual(saved({ title: 'Renamed', ...shown }), legacy);
});

test('changing only the end date keeps the start instant', () => {
  assert.deepEqual(saved({ ...shown, endDate: '2026-11-30' }), {
    startTime: '2026-11-20T00:00:00.000Z',
    endTime: '2026-12-01T05:00:00.000Z'
  });
});

test('changing only the start date keeps the end instant', () => {
  assert.deepEqual(saved({ ...shown, startDate: '2026-11-21' }), {
    startTime: '2026-11-21T05:00:00.000Z',
    endTime: '2026-11-27T00:00:00.000Z'
  });
});

test('a cleared date is not sent', () => {
  assert.deepEqual(scheduleChanges({ startDate: '', endDate: '' }, shown), {});
});
