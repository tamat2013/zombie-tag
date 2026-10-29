import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMatchResult, computeRewards, CURE_COINS, TASK_COINS, createDefaultProfile, levelInfo, normalizeProfile, bumpStat } from '../src/logic/progression.ts';
import { claimMission, currentMissions, ensureMissions, missionProgress } from '../src/logic/missions.ts';
import { buyUpgrade, buySkin, buySkinWithMedals, convertMedals, toggleLoadout } from '../src/logic/shop.ts';
import { getTournaments, knockoutOutcome, registerForTournament, tournamentStatus, rankOf, simulatedRivals } from '../src/logic/tournaments.ts';
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

test('every task pays extra coins, and doctors earn a bonus per heal', () => {
  const p = createDefaultProfile('u', 'T', '', NOW);
  const none = applyMatchResult(p, classicWin({ tasks: 0 }), NOW).rewards;
  const four = applyMatchResult(p, classicWin({ tasks: 4 }), NOW).rewards;
  assert.equal(four.coins - none.coins, 4 * TASK_COINS);
  const healer = applyMatchResult(p, classicWin({ cures: 2 }), NOW).rewards;
  assert.equal(healer.coins - four.coins, 2 * CURE_COINS);
  assert.ok(healer.lines.some((l) => l.label.includes('cures')));
});

test('a survivor who turned into a zombie gets half when the zombies win', () => {
  const p = createDefaultProfile('u', 'T', '', NOW);
  const zombieWin = { winner: 'zombie' as const, secondsSurvived: 300 };
  const born = applyMatchResult(p, classicWin({ ...zombieWin, startRole: 'zombie', finalRole: 'zombie', secondsSurvived: 0, tasks: 0 }), NOW).rewards;
  const full = computeRewards(classicWin({ ...zombieWin, startRole: 'survivor', finalRole: 'survivor' }), p);
  const turned = applyMatchResult(p, classicWin({ ...zombieWin, startRole: 'survivor', finalRole: 'zombie' }), NOW).rewards;
  assert.equal(turned.coins, Math.round(full.coins / 2));
  assert.equal(turned.xp, Math.round(full.xp / 2));
  assert.ok(turned.lines.some((l) => l.label.includes('half')));
  assert.ok(!born.lines.some((l) => l.label.includes('half')), 'starting zombies keep the full reward');
  // Losing as a turned zombie is not halved again.
  const lost = computeRewards(classicWin({ won: false, winner: 'survivor', startRole: 'survivor', finalRole: 'zombie' }), p);
  assert.ok(!lost.lines.some((l) => l.label.includes('half')));
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

test('shop: medal skins are bought with medals only', () => {
  const p = { ...createDefaultProfile('u', 'T', '', NOW), coins: 100_000, medals: 12 };
  assert.equal(buySkin(p, 'medalist').ok, false, 'coins cannot buy a medal skin');
  assert.equal(buySkinWithMedals({ ...p, medals: 11 }, 'medalist').ok, false);
  assert.equal(buySkinWithMedals(p, 'mint').ok, false, 'a coin skin is not sold for medals');
  const r = buySkinWithMedals(p, 'medalist');
  assert.ok(r.ok && r.profile.medals === 0 && r.profile.ownedSkins.includes('medalist') && r.profile.coins === p.coins);
  if (r.ok) assert.equal(buySkinWithMedals(r.profile, 'medalist').ok, false, 'cannot buy twice');
});

test('tournament schedule always has something live, and matches add leaderboard points', () => {
  const list = getTournaments(NOW);
  assert.ok(list.some((t) => tournamentStatus(t, NOW) === 'live'));
  const t = list.find((x) => tournamentStatus(x, NOW) === 'live')!;
  const p = registerForTournament(createDefaultProfile('u', 'T', '', NOW), t);
  const r = applyMatchResult(p, classicWin({ mode: 'tournament', tournamentId: t.id, roundSize: 8, advancing: 4 }), NOW);
  assert.ok(r.tournamentPointsGained > 0);
  const board = [...simulatedRivals(t, t.endsAt), { uid: 'u', name: 'T', points: 99999 }];
  assert.equal(rankOf(board, 'u'), 1);
});

test('knockout: only the starting team advances, down to a final of 2', () => {
  const ko = (extra: Partial<MatchResult>) => knockoutOutcome(classicWin({ mode: 'tournament', ...extra }));
  assert.deepEqual(ko({ roundSize: 8, advancing: 4 }), { kind: 'advance', nextSize: 4 });
  assert.deepEqual(ko({ roundSize: 4, advancing: 2 }), { kind: 'advance', nextSize: 2 });
  assert.deepEqual(ko({ roundSize: 2, advancing: 1 }), { kind: 'champion' });
  assert.deepEqual(ko({ won: false, roundSize: 2 }), { kind: 'out', place: 2 });
  assert.deepEqual(ko({ won: false, roundSize: 4 }), { kind: 'out', place: 3 });
  assert.deepEqual(ko({ won: false, roundSize: 8 }), { kind: 'out', place: 4 });
  assert.equal(knockoutOutcome(classicWin()), null);
});

test('knockout prizes are paid when the run ends; the champion gets the biggest prize', () => {
  const t = getTournaments(NOW).find((x) => tournamentStatus(x, NOW) === 'live')!;
  const p = registerForTournament(createDefaultProfile('u', 'T', '', NOW), t);
  const play = (extra: Partial<MatchResult>) => applyMatchResult(p, classicWin({ mode: 'tournament', tournamentId: t.id, ...extra }), NOW);
  const base = computeRewards(classicWin({ mode: 'tournament' }), p).coins;

  const advance = play({ roundSize: 8, advancing: 4 });
  assert.equal(advance.rewards.coins, base, 'no prize while still in the run');
  assert.ok(advance.rewards.lines.some((l) => l.label.includes('Semi-final')));

  const champ = play({ roundSize: 2, advancing: 1 });
  assert.equal(champ.rewards.coins, base + t.prizes[0].coins);
  assert.equal(champ.rewards.medals, t.prizes[0].medals);
  if (t.prizes[0].skin) assert.ok(champ.profile.ownedSkins.includes(t.prizes[0].skin));

  const runnerUp = play({ won: false, winner: 'zombie', roundSize: 2 });
  assert.ok(runnerUp.rewards.lines.some((l) => l.coins === t.prizes[1].coins && l.label.includes('Final')));
  assert.ok(t.prizes[0].coins > t.prizes[1].coins && t.prizes[1].coins > t.prizes[3].coins);
});

test('old profiles get new fields', () => {
  const p = normalizeProfile({ uid: 'x', displayName: 'Old', coins: 5 } as never, NOW);
  assert.equal(p.coins, 5);
  assert.ok(p.stats.wiresTasks === 0 && p.loadout.survivor.length > 0);
  const b = bumpStat(p, 'skinsCreated');
  assert.ok(b.unlocked.some((a) => a.id === 'designer'));
});
