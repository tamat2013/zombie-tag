import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUP_JOIN_MS, TOURNAMENT_GROUPS, getTournaments, nextGroup, openGroup, tournamentGroup } from '../src/logic/tournaments.ts';

const t = getTournaments(new Date(2026, 9, 27, 12, 30).getTime()).find((x) => x.id.startsWith('night'))!;
const len = (t.endsAt - t.startsAt) / TOURNAMENT_GROUPS;

test('a tournament has 100 groups and each is open for one minute', () => {
  assert.equal(TOURNAMENT_GROUPS, 100);
  const g = tournamentGroup(t, 3);
  assert.equal(g.startsAt, t.startsAt + 3 * len);
  assert.equal(g.joinEndsAt - g.startsAt, GROUP_JOIN_MS);
});

test('players joining in the same minute get the same group', () => {
  const a = openGroup(t, t.startsAt + 2 * len + 5_000);
  const b = openGroup(t, t.startsAt + 2 * len + 55_000);
  assert.equal(a?.index, 2);
  assert.equal(b?.index, 2);
  assert.equal(openGroup(t, t.startsAt + 2 * len + GROUP_JOIN_MS), null);
});

test('no group is open outside the tournament, and the next group is found', () => {
  assert.equal(openGroup(t, t.startsAt - 1), null);
  assert.equal(openGroup(t, t.endsAt), null);
  assert.equal(nextGroup(t, t.startsAt + 2 * len + 1)?.index, 3);
  assert.equal(nextGroup(t, t.startsAt + 99 * len + 1), null);
});
