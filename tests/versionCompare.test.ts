import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion, parseVersion } from '../src/services/versionCompare.ts';

test('parseVersion accepts x.y.z with an optional v prefix and rejects anything else', () => {
  assert.deepEqual(parseVersion('1.2.0'), [1, 2, 0]);
  assert.deepEqual(parseVersion('v10.0.3'), [10, 0, 3]);
  assert.equal(parseVersion('1.2'), null);
  assert.equal(parseVersion('latest'), null);
});

test('isNewerVersion compares numerically, not as text', () => {
  assert.equal(isNewerVersion('1.2.1', '1.2.0'), true);
  assert.equal(isNewerVersion('1.10.0', '1.9.9'), true);
  assert.equal(isNewerVersion('2.0.0', '1.99.99'), true);
  assert.equal(isNewerVersion('1.2.0', '1.2.0'), false);
  assert.equal(isNewerVersion('1.1.9', '1.2.0'), false);
  assert.equal(isNewerVersion('garbage', '1.2.0'), false);
});
