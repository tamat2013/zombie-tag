import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMatchResult, createDefaultProfile, levelInfo, normalizeProfile, bumpStat } from '../src/logic/progression.ts';
import { claimMission, currentMissions, ensureMissions, missionProgress } from '../src/logic/missions.ts';
import { buyUpgrade, buySkin, convertMedals, toggleLoadout } from '../src/logic/shop.ts';
import { claimTournamentPrize, getTournaments, registerForTournament, tournamentStatus, rankOf, simulatedRivals } from '../src/logic/tournaments.ts';
import type { MatchResult } from '../src/types.ts';

const NOW = new Date(2026, 9, 27, 12, 30).getTime();

function classicWin(extra: Partial<MatchResult> = {}): MatchResult {
  return {
    mode: 'classic', mapId: 'hospital', won: true, winner: 'survivor', finalRole: 'survivor', startRole: 'survivor',
    tasks: 4, tasksByType: { wires: 2, trash: 2 }, infections: 0, secondsSurvived: 600, abilitiesUsed: 3, durationSec: 600, ...extra,
  };
}

test('level curve', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(100 + 160).level, 3);
});

test('match result updates stats, rewards and achievements', () => {
  const p = createDefaultProfile('u', 'Tester', 'a@b.c', NOW);
  const r = applyMatchResult(p, classicWin(), NOW);
  assert.equal(r.profile.stats.wins, 1);
  assert.equal(r.profile.stats.wiresTasks, 2);
  assert.ok(r.rewards.xp > 100);
  assert.ok(r.newAchievements.some((a) => a.id === 'first_win'));
  assert.ok(r.profile.coins > p.coins + r.rewards.coins - 1);
});

test('training gives reduced rewards', () => {
  const p = createDefaultProfile('u', 'T', '', NOW);
  const classic = applyMatchResult(p, classicWin(), NOW).rewards;
  const training = applyMatchResult(p, classicWin({ mode: 'training' }), NOW).rewards;
  assert.ok(training.xp < classic.xp && training.coins < classic.coins);
});

test('obstacle medals are only awarded for improvements', () => {
  let p = createDefaultProfile('u', 'T', '', NOW);
  const run = (ms: number): MatchResult => ({ ...classicWin({ mode: 'obstacle', mapId: 'obstacle_rookie', obstacleTimeMs: ms }), tasks: 0, tasksByType: {} });
  let r = applyMatchResult(p, run(60_000), NOW); // bronze
  assert.equal(r.rewards.medals, 1);
  p = r.profile;
  r = applyMatchResult(p, run(65_000), NOW);
  assert.equal(r.rewards.medals, 0);
  r = applyMatchResult(p, run(20_000), NOW); // gold
  assert.equal(r.rewards.medals, 2);
  assert.equal(r.profile.obstacleMedals.obstacle_rookie, 'gold');
});

test('missions track progress from a baseline and can be claimed once', () => {
  let p = createDefaultProfile('u', 'T', '', NOW);
  p = { ...p, stats: { ...p.stats, matchesPlayed: 50 } };
  p = ensureMissions({ ...p, missions: { ...p.missions, dailyKey: 'old' } }, NOW);
  const { daily } = currentMissions(NOW);
  assert.equal(daily.length, 3);
  const m = daily[0];
  assert.equal(missionProgress(p, m, 'daily'), 0);
  p = { ...p, stats: { ...p.stats, [m.stat]: p.stats[m.stat] + m.target } };
  assert.equal(missionProgress(p, m, 'daily'), m.target);
  const claimed = claimMission(p, m, 'daily');
  assert.ok(claimed);
  assert.equal(claimed!.coins, p.coins + m.coins);
  assert.equal(claimMission(claimed!, m, 'daily'), null);
});

test('shop: upgrades need level and coins', () => {
  let p = createDefaultProfile('u', 'T', '', NOW);
  p.coins = 10_000;
  const first = buyUpgrade(p, 'speed');
  assert.ok(first.ok);
  if (first.ok) {
    const second = buyUpgrade(first.profile, 'speed');
    assert.equal(second.ok, false, 'level 2 upgrade should need player level 3');
  }
  assert.equal(buySkin({ ...p, coins: 0 }, 'ninja').ok, false);
  assert.equal(buySkin(p, 'champion').ok, false);
  const conv = convertMedals({ ...p, medals: 3 }, 2);
  assert.ok(conv.ok && conv.profile.medals === 1 && conv.profile.coins === p.coins + 100);
  const lo = toggleLoadout(p, 'survivor', 'scan');
  assert.ok(lo.ok && !lo.profile.loadout.survivor.includes('scan'));
});

test('tournament schedule always has something live or upcoming, prizes claim once after end', () => {
  const list = getTournaments(NOW);
  assert.ok(list.some((t) => tournamentStatus(t, NOW) === 'live'));
  const t = list.find((x) => tournamentStatus(x, NOW) === 'live')!;
  let p = registerForTournament(createDefaultProfile('u', 'T', '', NOW), t);
  const r = applyMatchResult(p, classicWin({ mode: 'tournament', tournamentId: t.id }), NOW);
  assert.ok(r.tournamentPointsGained > 0);
  p = r.profile;
  assert.equal(claimTournamentPrize(p, t, 1, NOW), null, 'cannot claim before end');
  const after = claimTournamentPrize(p, t, 1, t.endsAt + 1);
  assert.ok(after && after.coins > p.coins);
  assert.equal(claimTournamentPrize(after!, t, 1, t.endsAt + 1), null);
  const board = [...simulatedRivals(t, t.endsAt), { uid: 'u', name: 'T', points: 99999 }];
  assert.equal(rankOf(board, 'u'), 1);
});

test('old profiles get new fields', () => {
  const p = normalizeProfile({ uid: 'x', displayName: 'Old', coins: 5 } as never, NOW);
  assert.equal(p.coins, 5);
  assert.ok(p.stats.wiresTasks === 0 && p.loadout.survivor.length > 0);
  const b = bumpStat(p, 'skinsCreated');
  assert.ok(b.unlocked.some((a) => a.id === 'designer'));
});
