import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILT_IN_MAPS, HOSPITAL_ROWS, MALL_ROWS, BASE_ROWS, OBSTACLE_ROOKIE_ROWS, OBSTACLE_SAW_ROWS, mapFromAscii, mapToAscii } from '../src/data/maps.ts';
import { BUILT_IN_SKINS } from '../src/data/skins.ts';
import { GameEngine, assignRoles } from '../src/engine/GameEngine.ts';
import type { RosterEntry } from '../src/engine/entities.ts';
import { validateMap, moveWithCollision, isSolid, tileAt, toTile, getTaskStations } from '../src/engine/map.ts';
import { findPath } from '../src/engine/pathfinding.ts';
import { AbilityManager } from '../src/engine/abilities.ts';

const skin = BUILT_IN_SKINS[0];

function roster(n: number, zombies: number[], localId = 'p0'): RosterEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i === 0 ? localId : `bot${i}`,
    name: `P${i}`,
    isBot: i !== 0,
    role: zombies.includes(i) ? 'zombie' : 'survivor',
    skin,
  }));
}

test('all ASCII maps have equal-length rows', () => {
  for (const [name, rows] of Object.entries({ HOSPITAL_ROWS, MALL_ROWS, BASE_ROWS, OBSTACLE_ROOKIE_ROWS, OBSTACLE_SAW_ROWS })) {
    const lengths = new Set(rows.map((r) => r.length));
    assert.equal(lengths.size, 1, `${name} has rows of lengths ${[...lengths]}: ${rows.map((r, i) => `${i}:${r.length}`).join(' ')}`);
  }
});

test('built-in maps are valid and fully connected', () => {
  for (const m of BUILT_IN_MAPS) {
    const v = validateMap(m);
    assert.ok(v.ok, `${m.id}: ${v.errors.join(', ')}`);
  }
});

test('ascii round trip', () => {
  const m = BUILT_IN_MAPS[0];
  const again = mapFromAscii('x', 'x', mapToAscii(m));
  assert.deepEqual(again.tiles, m.tiles);
});

test('collision keeps players out of walls', () => {
  const m = BUILT_IN_MAPS[0];
  const pos = { x: 48 * 1.5, y: 48 * 1.5 };
  for (let i = 0; i < 200; i++) moveWithCollision(m, pos, -7, -7);
  assert.ok(!isSolid(tileAt(m, toTile(pos.x), toTile(pos.y))));
  assert.ok(pos.x >= 48 + 15 && pos.y >= 48 + 15, `pushed inside the room: ${pos.x},${pos.y}`);
});

test('pathfinding finds a route across the hospital', () => {
  const m = BUILT_IN_MAPS[0];
  const path = findPath(m, { tx: 1, ty: 1 }, { tx: 29, ty: 18 });
  assert.ok(path && path.length > 10);
});

test('zombies are held until release, then a hard zombie bot infects a dummy survivor', () => {
  const m = BUILT_IN_MAPS[0];
  const r = roster(2, [1]);
  const e = new GameEngine({ map: m, mode: 'classic', roster: r, localId: 'p0', isAuthority: true, startTime: 0, difficulty: 'hard', seed: 7 });
  const z = e.getPlayer('bot1')!;
  const zStart = { x: z.x, y: z.y };
  for (let t = 0; t <= 4000; t += 33) e.update(t, { x: 0, y: 0 });
  assert.deepEqual({ x: z.x, y: z.y }, zStart, 'zombie moved before release');
  let infectedAt = -1;
  for (let t = 4033; t < 120_000; t += 33) {
    e.update(t, { x: 0, y: 0 });
    if (e.local!.role === 'zombie') {
      infectedAt = t;
      break;
    }
  }
  assert.ok(infectedAt > 0, 'zombie bot never caught the idle player');
  assert.equal(e.ended?.winner, 'zombie');
  assert.equal(z.infections, 1);
});

test('survivors win when the timer runs out', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(3, [2]), localId: 'p0', isAuthority: true, startTime: 0, durationSec: 5, difficulty: 'dummy' });
  for (let t = 0; t <= 6000; t += 50) e.update(t, { x: 0, y: 0 });
  assert.equal(e.ended?.winner, 'survivor');
  assert.equal(e.result().won, true);
});

test('survivor bots complete tasks', () => {
  const m = BUILT_IN_MAPS[0];
  const r = roster(4, []);
  r.push({ id: 'zz', name: 'Z', isBot: true, role: 'zombie', skin });
  const e = new GameEngine({ map: m, mode: 'classic', roster: r, localId: 'p0', isAuthority: true, startTime: 0, durationSec: 60, difficulty: 'normal', releaseDelaySec: 999, seed: 3 });
  for (let t = 0; t <= 60_000; t += 33) e.update(t, { x: 0, y: 0 });
  const done = e.players.filter((p) => p.isBot && p.role === 'survivor').reduce((s, p) => s + p.completedStations.length, 0);
  assert.ok(done >= 3, `bots completed only ${done} tasks`);
});

test('medic shield blocks infection and medic cures a fresh zombie', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(3, [2]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'dummy' });
  const me = e.local!;
  const ally = e.getPlayer('bot1')!;
  const z = e.getPlayer('bot2')!;
  e.update(10, { x: 0, y: 0 });
  // Put the zombie right on top of the ally to infect it.
  z.x = ally.x + 10; z.y = ally.y;
  me.x = ally.x - 60; me.y = ally.y;
  e.update(40, { x: 0, y: 0 });
  assert.equal(ally.role, 'zombie');
  z.x = 48 * 25; z.y = 48 * 2;
  assert.ok(e.useAbility('medic'));
  assert.equal(ally.role, 'survivor', 'medic should cure a just-infected ally');
  assert.ok(me.effects.shield > e.now);
  z.x = me.x + 5; z.y = me.y;
  e.update(80, { x: 0, y: 0 });
  assert.equal(me.role, 'survivor', 'shield should block infection');
});

test('ability manager respects cooldowns and suggests sprint when chased', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(2, [1]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'dummy' });
  const me = e.local!;
  const z = e.getPlayer('bot1')!;
  z.x = me.x + 120; z.y = me.y;
  e.update(10, { x: 0, y: 0 });
  assert.equal(AbilityManager.suggest(e, me, e.now), 'sprint');
  assert.ok(e.useAbility('sprint'));
  assert.equal(e.useAbility('sprint'), false, 'second use should be on cooldown');
});

test('obstacle course: hazard respawns, finish ends the run', () => {
  const m = BUILT_IN_MAPS.find((x) => x.id === 'obstacle_rookie')!;
  const e = new GameEngine({ map: m, mode: 'obstacle', roster: roster(1, []), localId: 'p0', isAuthority: true, startTime: 0 });
  const me = e.local!;
  // Teleport onto a spike tile.
  me.x = 10 * 48 + 24; me.y = 1 * 48 + 24;
  e.update(16, { x: 0, y: 0 });
  assert.equal(me.deaths, 1);
  // Teleport onto finish.
  me.respawnUntil = 0;
  const finishRow = OBSTACLE_ROOKIE_ROWS.findIndex((r) => r.includes('F'));
  me.x = OBSTACLE_ROOKIE_ROWS[finishRow].indexOf('F') * 48 + 24; me.y = finishRow * 48 + 24;
  e.update(5000, { x: 0, y: 0 });
  assert.equal(e.ended?.winner, 'finish');
  assert.ok(e.result().obstacleTimeMs! > 0);
});

test('network state round-trips role changes and infection credit', () => {
  const m = BUILT_IN_MAPS[0];
  const r: RosterEntry[] = [
    { id: 'me', name: 'me', isBot: false, role: 'zombie', skin },
    { id: 'other', name: 'o', isBot: false, role: 'survivor', skin },
  ];
  const e = new GameEngine({ map: m, mode: 'classic', roster: r, localId: 'me', isAuthority: false, startTime: 0 });
  e.applyRemoteState('other', { x: 100, y: 100, f: 0, r: 'z', t: 0, i: 0, ib: 'me', ia: 0 });
  assert.equal(e.getPlayer('other')!.role, 'zombie');
  assert.equal(e.local!.infections, 1);
  e.update(16, { x: 0, y: 0 });
  assert.equal(e.ended?.winner, 'zombie');
});

test('assignRoles picks about one zombie per five players', () => {
  const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
  const roles = assignRoles(ids, () => 0.3);
  assert.equal(Object.values(roles).filter((r) => r === 'zombie').length, 2);
  const forced = assignRoles(ids, () => 0.3, 'p9');
  assert.equal(forced.p9, 'zombie');
});

test('every arena map has all 5 task types', () => {
  for (const m of BUILT_IN_MAPS.filter((x) => x.kind === 'arena')) {
    const types = new Set(getTaskStations(m).map((s) => s.type));
    assert.equal(types.size, 5, m.id);
  }
});
