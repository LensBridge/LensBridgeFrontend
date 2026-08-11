/**
 * Pins the slide-duration transforms in the board contract model.
 *
 * The quote helpers carry the whole weight of "empty means auto". A quote's
 * `durationSeconds` is the one duration in this contract with no sentinel: PUT
 * /weekly-content/{year}/{weekNumber} replaces the entire quote list, so null
 * is unambiguous there — while `agendaDurationSeconds` PATCHes field by field
 * and has to travel as 0 instead. Getting the two confused is a silent bug in
 * both directions: a 0 sent to QuoteEntry fails @Min(5) with a 400 that names
 * no quote, and a null sent to UpdateBoardConfigRequest is skipped, leaving the
 * old number in place while the form claims it is now auto.
 *
 * BoardService.normalizeQuote delegates to `toQuoteDurationSeconds` for both
 * reads and writes, so what this file asserts is what reaches the wire.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AGENDA_DURATION_AUTO,
  SLIDE_DURATION_MAX_SECONDS,
  SLIDE_DURATION_MIN_SECONDS,
  frameDurationLabel,
  quoteDurationError,
  slideDurationErrors,
  toDeviceConfigPatch,
  toQuoteDurationSeconds
} from './board.js';

test('an unset quote duration serializes to null, never 0 or the empty string', () => {
  for (const blank of ['', null, undefined]) {
    const seconds = toQuoteDurationSeconds(blank);
    assert.equal(seconds, null);
    assert.notEqual(seconds, 0);
    assert.notEqual(seconds, '');
  }
});

test('keeps a typed duration as a number, whichever way the input hands it over', () => {
  // <input type="number"> gives a string; form state that has been round-tripped
  // through a saved response gives a number.
  assert.equal(toQuoteDurationSeconds('30'), 30);
  assert.equal(toQuoteDurationSeconds(30), 30);
  assert.equal(toQuoteDurationSeconds(SLIDE_DURATION_MIN_SECONDS), 5);
});

test('treats junk as auto rather than sending NaN', () => {
  assert.equal(toQuoteDurationSeconds('abc'), null);
  assert.equal(toQuoteDurationSeconds(Number.NaN), null);
});

test('does not clamp an out-of-range duration into silent validity', () => {
  // Clamping would save a number the admin never chose. Passing it through is
  // what lets quoteDurationError report it instead.
  assert.equal(toQuoteDurationSeconds('500'), 500);
  assert.equal(toQuoteDurationSeconds('1'), 1);
});

test('auto is always a valid quote duration', () => {
  assert.equal(quoteDurationError(null), '');
  assert.equal(quoteDurationError(''), '');
  assert.equal(quoteDurationError(undefined), '');
});

test('accepts the inclusive bounds QuoteEntry validates', () => {
  assert.equal(quoteDurationError(SLIDE_DURATION_MIN_SECONDS), '');
  assert.equal(quoteDurationError(SLIDE_DURATION_MAX_SECONDS), '');
  assert.equal(quoteDurationError(30), '');
});

test('rejects what the backend would reject, before the request is sent', () => {
  assert.match(quoteDurationError(0), /between 5 and 120/);
  assert.match(quoteDurationError(SLIDE_DURATION_MIN_SECONDS - 1), /between 5 and 120/);
  assert.match(quoteDurationError(SLIDE_DURATION_MAX_SECONDS + 1), /between 5 and 120/);
  assert.match(quoteDurationError(12.5), /whole number/);
});

test('labels a null duration as Auto and a number in seconds', () => {
  assert.equal(frameDurationLabel(null), 'Auto');
  assert.equal(frameDurationLabel(undefined), 'Auto');
  assert.equal(frameDurationLabel(30), '30s');
});

test('the agenda duration still needs its 0 sentinel, unlike a quote', () => {
  // The asymmetry is deliberate; this is here so nobody "fixes" it by making
  // both fields send null.
  const patch = toDeviceConfigPatch({ agendaDurationSeconds: null });
  assert.equal(patch.agendaDurationSeconds, AGENDA_DURATION_AUTO);
  assert.equal(patch.agendaDurationSeconds, 0);
});

test('a null agenda duration is auto on the way in, not an error', () => {
  assert.deepEqual(slideDurationErrors({ agendaDurationSeconds: null }), {});
  assert.deepEqual(slideDurationErrors({ agendaDurationSeconds: 3 }), {
    agendaDurationSeconds: 'Must be between 5 and 120 seconds.'
  });
});
