import test from 'node:test';
import assert from 'node:assert/strict';
import { RATING_FIRST_ASK_MS, RATING_REPEAT_MS, averageStars, clampStars, shouldAskForRating } from '../src/logic/rating.ts';

test('never asks before the first-seen time is recorded or too soon', () => {
  assert.equal(shouldAskForRating({}, 1e12), false);
  assert.equal(shouldAskForRating({ firstSeen: 1000 }, 1000 + RATING_FIRST_ASK_MS - 1), false);
  assert.equal(shouldAskForRating({ firstSeen: 1000 }, 1000 + RATING_FIRST_ASK_MS), true);
});

test('asks again after a month, never once rated', () => {
  assert.equal(shouldAskForRating({ firstSeen: 0, lastAsked: 5000 }, 5000 + RATING_REPEAT_MS - 1), false);
  assert.equal(shouldAskForRating({ firstSeen: 0, lastAsked: 5000 }, 5000 + RATING_REPEAT_MS), true);
  assert.equal(shouldAskForRating({ firstSeen: 0, lastAsked: 0, stars: 4 }, 1e13), false);
});

test('stars are clamped and averaged', () => {
  assert.equal(clampStars(0), 1);
  assert.equal(clampStars(9), 5);
  assert.equal(averageStars([]), 0);
  assert.equal(averageStars([5, 4, 4]), 4.3);
});
