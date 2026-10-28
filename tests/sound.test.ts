import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SOUND_SETTINGS, distanceVolume, heartbeatInterval, normalizeSoundSettings } from '../src/logic/soundSettings.ts';

test('sound settings fill in missing or broken values', () => {
  assert.deepEqual(normalizeSoundSettings(null), DEFAULT_SOUND_SETTINGS);
  assert.deepEqual(normalizeSoundSettings({ music: 'loud', sfx: 7, footsteps: 'no', muted: true }), { ...DEFAULT_SOUND_SETTINGS, sfx: 1, muted: true });
  assert.equal(normalizeSoundSettings({ music: 0.33 }).music, 0.3);
  assert.equal(normalizeSoundSettings({ music: -1 }).music, 0);
});

test('sounds fade with distance', () => {
  assert.equal(distanceVolume(0, 500), 1);
  assert.equal(distanceVolume(500, 500), 0);
  assert.ok(distanceVolume(100, 500) > distanceVolume(300, 500));
});

test('heartbeat speeds up as a zombie gets closer', () => {
  assert.ok(heartbeatInterval(30, 320) < heartbeatInterval(300, 320));
  assert.equal(heartbeatInterval(9999, 320), heartbeatInterval(320, 320));
});
