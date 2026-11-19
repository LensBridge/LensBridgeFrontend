import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampDays, filenameFrom, volunteerSteps } from './usbKit.js';

test('days are clamped to 1-92, defaulting to two weeks', () => {
  assert.equal(clampDays(92), 92);
  assert.equal(clampDays(120), 92);
  assert.equal(clampDays('31'), 31);
  assert.equal(clampDays(0), 14);
  assert.equal(clampDays('lots'), 14);
});

test('the filename comes from Content-Disposition', () => {
  assert.equal(filenameFrom('attachment; filename="musallahboard-setup-3f2a1b4c.mbu"', 'x'), 'musallahboard-setup-3f2a1b4c.mbu');
  assert.equal(filenameFrom(null, 'fallback.zip'), 'fallback.zip');
});

test('the volunteer instruction names the board', () => {
  assert.deepEqual(volunteerSteps('North Musallah')[1],
    'Plug the stick into the board, wait for "Set up as North Musallah", remove it.');
  assert.match(volunteerSteps('North Musallah', { kit: false })[0], /MusallahBoard folder/);
  assert.match(volunteerSteps('')[1], /this board/);
});
