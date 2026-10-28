import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILT_IN_MAPS, HOSPITAL_ROWS, MALL_ROWS, BASE_ROWS, OBSTACLE_ROOKIE_ROWS, OBSTACLE_SAW_ROWS, mapFromAscii, mapToAscii } from '../src/data/maps.ts';
import { BUILT_IN_SKINS } from '../src/data/skins.ts';
import { GameEngine, assignRoles, knockoutRoles } from '../src/engine/GameEngine.ts';
import type { RosterEntry } from '../src/engine/entities.ts';
import { validateMap, moveWithCollision, isSolid, tileAt, toTile, getTaskStations } from '../src/engine/map.ts';
import { findPath } from '../src/engine/pathfinding.ts';
import { AbilityManager, LEAP_DISTANCE, buildModifiers } from '../src/engine/abilities.ts';
import { TASK_TIME_BONUS_SEC, TASK_TIME_MAX_SHARE, TOURNAMENT_SURVIVOR_SPEED_MUL, TOURNAMENT_ZOMBIE_SPEED_MUL } from '../src/engine/constants.ts';

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
  const pos = { x: 48 * 2.5, y: 48 * 2.5 }; // inside the room; walls are 2 tiles thick
  for (let i = 0; i < 200; i++) moveWithCollision(m, pos, -7, -7);
  assert.ok(!isSolid(tileAt(m, toTile(pos.x), toTile(pos.y))));
  assert.ok(pos.x >= 96 + 15 && pos.y >= 96 + 15, `pushed inside the room: ${pos.x},${pos.y}`);
});

test('pathfinding finds a route across the hospital', () => {
  const m = BUILT_IN_MAPS[0];
  const path = findPath(m, { tx: 2, ty: 2 }, { tx: 58, ty: 36 });
  assert.ok(path && path.length > 40);
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

test('medic shield blocks infection', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(2, [1]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'dummy' });
  const me = e.local!;
  const z = e.getPlayer('bot1')!;
  e.update(10, { x: 0, y: 0 });
  assert.ok(e.useAbility('medic'));
  assert.ok(me.effects.shield > e.now);
  z.x = me.x + 5; z.y = me.y;
  e.update(40, { x: 0, y: 0 });
  assert.equal(me.role, 'survivor', 'shield should block infection');
});

/** 5 survivors + 1 zombie, with p0 and bot1 forced to be the two doctors. */
function doctorMatch() {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(6, [5]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'dummy' });
  for (const p of e.players) p.doctor = p.id === 'p0' || p.id === 'bot1';
  e.update(10, { x: 0, y: 0 });
  return { e, z: e.getPlayer('bot5')! };
}

function infect(e: GameEngine, z: { x: number; y: number }, victim: { x: number; y: number }, t: number) {
  z.x = victim.x + 10; z.y = victim.y;
  e.update(t, { x: 0, y: 0 });
  z.x = 48 * 25; z.y = 48 * 2;
}

test('exactly two doctors are picked, the same on every client', () => {
  const m = BUILT_IN_MAPS[0];
  const a = new GameEngine({ map: m, mode: 'classic', roster: roster(8, [7]), localId: 'p0', isAuthority: true, startTime: 0, seed: 42 });
  const b = new GameEngine({ map: m, mode: 'classic', roster: roster(8, [7]).reverse(), localId: 'bot3', isAuthority: false, startTime: 0, seed: 42 });
  const docs = (e: GameEngine) => e.players.filter((p) => p.doctor).map((p) => p.id).sort();
  assert.equal(docs(a).length, 2);
  assert.deepEqual(docs(a), docs(b));
  assert.ok(a.players.filter((p) => p.doctor).every((p) => p.role === 'survivor'));
});

test('an infected player is frozen 10 seconds and a doctor heals by touch', () => {
  const { e, z } = doctorMatch();
  const me = e.local!;
  const victim = e.getPlayer('bot2')!;
  me.x = victim.x - 200; me.y = victim.y;
  infect(e, z, victim, 40);
  assert.equal(victim.role, 'zombie');
  assert.ok(e.isFrozen(victim));
  assert.equal(e.canMove(victim), false);
  // A frozen zombie does not infect.
  me.x = victim.x + 5;
  e.update(80, { x: 0, y: 0 });
  assert.equal(victim.role, 'survivor', 'doctor touch should heal');
  assert.equal(me.role, 'survivor');
  assert.equal(victim.doctor, false);
});

test('only doctors can heal, and not after the 10 seconds', () => {
  const { e, z } = doctorMatch();
  const me = e.local!;
  const victim = e.getPlayer('bot2')!;
  const normal = e.getPlayer('bot3')!;
  me.x = victim.x - 300; me.y = victim.y;
  infect(e, z, victim, 40);
  normal.x = victim.x + 5; normal.y = victim.y;
  e.update(80, { x: 0, y: 0 });
  assert.equal(victim.role, 'zombie', 'a regular survivor cannot heal');
  normal.x = victim.x + 400;
  e.update(10_100, { x: 0, y: 0 });
  assert.equal(e.isFrozen(victim), false);
  me.x = victim.x + 5; me.y = victim.y;
  victim.x = me.x; // keep it from walking off
  e.update(10_120, { x: 0, y: 0 });
  assert.notEqual(victim.role, 'survivor', 'too late to heal');
});

test('doctors heal without limit, but a doctor healed by a doctor loses the power', () => {
  const { e, z } = doctorMatch();
  const me = e.local!;
  const doc2 = e.getPlayer('bot1')!;
  let t = 40;
  for (const id of ['bot2', 'bot3', 'bot4']) {
    const v = e.getPlayer(id)!;
    me.x = v.x - 300; me.y = v.y;
    infect(e, z, v, t += 20);
    me.x = v.x + 5; me.y = v.y;
    e.update(t += 20, { x: 0, y: 0 });
    assert.equal(v.role, 'survivor', `${id} should be healed`);
  }
  assert.equal(me.cures, 3);
  assert.equal(e.result().cures, 3);
  // Infect the second doctor, then heal them.
  me.x = doc2.x - 300; me.y = doc2.y;
  infect(e, z, doc2, t += 20);
  me.x = doc2.x + 5; me.y = doc2.y;
  e.update(t += 20, { x: 0, y: 0 });
  assert.equal(doc2.role, 'survivor');
  assert.equal(doc2.doctor, false, 'healed doctor can no longer heal');
  assert.equal(me.doctor, true);
  // The healed doctor cannot heal anyone now.
  const v = e.getPlayer('bot2')!;
  me.x = v.x - 300;
  doc2.x = v.x - 300; doc2.y = v.y;
  e.update(t += 3000, { x: 0, y: 0 });
  infect(e, z, v, t += 20);
  doc2.x = v.x + 5;
  e.update(t += 20, { x: 0, y: 0 });
  assert.equal(v.role, 'zombie');
});

test('doctor status travels over the network', () => {
  const { e } = doctorMatch();
  const me = e.local!;
  const s = e.serialize(me);
  assert.equal(s.d, 1);
  const m = BUILT_IN_MAPS[0];
  const other = new GameEngine({ map: m, mode: 'classic', roster: roster(6, [5], 'x'), localId: 'bot1', isAuthority: false, startTime: 0 });
  const remote = other.getPlayer('x')!;
  other.applyRemoteState('x', { ...s, d: 0 });
  assert.equal(remote.doctor, false);
});

test("a heal done on the patient's client is credited to the remote doctor", () => {
  const m = BUILT_IN_MAPS[0];
  const docClient = new GameEngine({ map: m, mode: 'classic', roster: roster(6, [5], 'x'), localId: 'bot1', isAuthority: false, startTime: 0 });
  const doc = docClient.local!;
  doc.doctor = true;
  const patient = docClient.getPlayer('x')!;
  const s = docClient.serialize(patient);
  docClient.applyRemoteState('x', { ...s, r: 'z', ib: 'bot5', ia: 0 });
  docClient.drainEvents();
  docClient.applyRemoteState('x', { ...s, r: 's', cb: 'bot1' });
  assert.equal(patient.role, 'survivor');
  assert.equal(doc.cures, 1);
  assert.ok(docClient.drainEvents().some((ev) => ev.type === 'cured' && ev.byId === 'bot1'));
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

test('zombies are slower than survivors', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(2, [1]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'dummy' });
  e.update(10, { x: 0, y: 0 });
  assert.ok(e.speedOf(e.getPlayer('bot1')!) < e.speedOf(e.local!));
});

test('a survivor throws one stone per match, it stops at walls and travels over the network', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(3, [2]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 999, difficulty: 'dummy' });
  e.update(10, { x: 0, y: 0 });
  const me = e.local!;
  assert.ok(e.useStone());
  assert.equal(e.useStone(), false, 'only one stone per match');
  const n = e.activeNoises();
  assert.equal(n.length, 1);
  assert.ok(!isSolid(tileAt(m, toTile(n[0].x), toTile(n[0].y))), 'stone landed inside a wall');
  assert.ok(Math.hypot(n[0].x - me.x, n[0].y - me.y) <= 48 * 6 + 1);
  assert.equal(e.drainEvents().filter((ev) => ev.type === 'stone').length, 1);
  // Zombies cannot throw stones.
  e.local!.role = 'zombie';
  me.stoneUsed = false;
  assert.equal(e.useStone(), false);
  me.role = 'survivor';
  me.stoneUsed = true;

  const other = new GameEngine({ map: m, mode: 'classic', roster: roster(3, [2], 'x'), localId: 'bot1', isAuthority: false, startTime: 0 });
  other.update(10, { x: 0, y: 0 });
  other.applyRemoteState('x', e.serialize(me));
  assert.equal(other.getPlayer('x')!.stoneUsed, true);
  assert.equal(other.activeNoises().length, 1);
  e.update(6000, { x: 0, y: 0 });
  assert.equal(e.activeNoises().length, 0, 'noise fades out');
});

test('a stone pulls a zombie bot towards the noise', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(2, [1]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'hard', seed: 5 });
  const me = e.local!;
  const z = e.getPlayer('bot1')!;
  // Park the survivor far away and out of sight, then make a noise elsewhere near the zombie.
  me.x = 48 * 1.5; me.y = 48 * 1.5;
  e.update(10, { x: 0, y: 0 });
  me.noise = { x: z.x, y: z.y, at: 10, until: 5010 };
  // Find a walkable spot a few tiles away from the zombie for the noise.
  for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, -3]]) {
    const x = z.x + dx * 48, y = z.y + dy * 48;
    if (!isSolid(tileAt(m, toTile(x), toTile(y)))) { me.noise = { x, y, at: 10, until: 5010 }; break; }
  }
  const start = Math.hypot(me.noise.x - z.x, me.noise.y - z.y);
  let closest = start;
  for (let t = 43; t < 3000; t += 33) {
    e.update(t, { x: 0, y: 0 });
    closest = Math.min(closest, Math.hypot(me.noise!.x - z.x, me.noise!.y - z.y));
  }
  assert.ok(closest < 30, `zombie did not reach the noise (closest ${Math.round(closest)} of ${Math.round(start)})`);
});

test('zombies hear nearby survivors (sound waves)', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(3, [2]), localId: 'bot2', isAuthority: true, startTime: 0, difficulty: 'dummy' });
  const z = e.getPlayer('bot2')!;
  const near = e.getPlayer('p0')!;
  const far = e.getPlayer('bot1')!;
  near.x = z.x + 100; near.y = z.y;
  far.x = z.x + 1000; far.y = z.y;
  assert.deepEqual(e.heardSurvivors(z).map((p) => p.id), ['p0']);
  near.effects.invisible = Infinity;
  assert.equal(e.heardSurvivors(z).length, 0, 'invisible survivors make no sound');
});

test('knockout roles are half zombies, half survivors', () => {
  const ids = Array.from({ length: 8 }, (_, i) => `p${i}`);
  const roles = knockoutRoles(ids, () => 0.3);
  assert.equal(Object.values(roles).filter((r) => r === 'zombie').length, 4);
  assert.equal(Object.values(knockoutRoles(['a', 'b'])).filter((r) => r === 'zombie').length, 1);
});

test('tournament: survivors faster, zombies slower, and you win with your starting team', () => {
  const m = BUILT_IN_MAPS[0];
  const make = (mode: 'classic' | 'tournament') => {
    const e = new GameEngine({ map: m, mode, roster: roster(4, [2, 3]), localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'dummy' });
    e.update(10, { x: 0, y: 0 });
    return e;
  };
  const c = make('classic');
  const t = make('tournament');
  const s = (e: GameEngine, id: string) => e.speedOf(e.getPlayer(id)!);
  assert.ok(Math.abs(s(t, 'p0') - s(c, 'p0') * TOURNAMENT_SURVIVOR_SPEED_MUL) < 0.01);
  assert.ok(Math.abs(s(t, 'bot2') - s(c, 'bot2') * TOURNAMENT_ZOMBIE_SPEED_MUL) < 0.01);

  // p0 started as a survivor and got infected; the survivors still win on time, so p0 advances.
  const e = new GameEngine({ map: m, mode: 'tournament', roster: roster(4, [2, 3]), localId: 'p0', isAuthority: true, startTime: 0, durationSec: 3, difficulty: 'dummy' });
  e.update(10, { x: 0, y: 0 });
  const z2 = e.getPlayer('bot2')!;
  e.local!.role = 'zombie';
  e.local!.x = z2.x; e.local!.y = z2.y; // away from the last survivor
  for (let ms = 0; ms <= 4000; ms += 50) e.update(ms, { x: 0, y: 0 });
  assert.equal(e.ended?.winner, 'survivor');
  const r = e.result();
  assert.equal(r.won, true);
  assert.equal(r.roundSize, 4);
  assert.equal(r.advancing, 2);
});

test('new abilities: smoke blinds zombies, frenzy speeds up, leap jumps, teleport escapes', () => {
  const m = BUILT_IN_MAPS[0];
  const loadout = { survivor: ['smoke', 'teleport'] as const, zombie: ['frenzy', 'leap'] as const };
  const r = roster(2, [1]).map((x) => ({ ...x, loadout: { survivor: [...loadout.survivor], zombie: [...loadout.zombie] } }));
  const e = new GameEngine({ map: m, mode: 'classic', roster: r, localId: 'p0', isAuthority: true, startTime: 0, releaseDelaySec: 0, difficulty: 'dummy' });
  e.update(10, { x: 0, y: 0 });
  const me = e.local!;
  const z = e.getPlayer('bot1')!;
  z.x = me.x + 120; z.y = me.y;
  const sight = e.visionRadius(z);
  assert.ok(e.useAbility('smoke'));
  assert.ok(e.visionRadius(z) < sight * 0.5, 'smoke shrinks zombie vision');

  const before = { x: me.x, y: me.y };
  assert.ok(e.useAbility('teleport'));
  assert.ok(me.x !== before.x || me.y !== before.y, 'teleport moves the survivor');

  const slow = e.speedOf(z);
  e.activateAbility(z, 'frenzy');
  assert.ok(e.speedOf(z) > slow * 1.3);

  // Leap from open floor in each direction: never further than the leap, never into a wall.
  const open = { x: me.x, y: me.y }; // teleport lands on a spawn tile's center
  let best = 0;
  for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    z.x = open.x; z.y = open.y; z.facing = facing; z.cooldowns = {};
    e.activateAbility(z, 'leap');
    const d = Math.hypot(z.x - open.x, z.y - open.y);
    assert.ok(d <= LEAP_DISTANCE + 1);
    assert.ok(!isSolid(tileAt(m, toTile(z.x), toTile(z.y))));
    best = Math.max(best, d);
  }
  assert.ok(best > 48, 'leap moves at least one tile somewhere');
});

test('new skin powers', () => {
  const byPower = (power: string) => buildModifiers({ ...skin, power: power as never });
  assert.ok(byPower('engineer').task > 1.2);
  assert.ok(byPower('master').cooldown < 0.9);
  assert.ok(byPower('brute').zombieSpeed > 1);
});

test('finished tasks cut time off the clock, up to a cap', () => {
  const m = BUILT_IN_MAPS[0];
  const e = new GameEngine({ map: m, mode: 'classic', roster: roster(3, [2]), localId: 'p0', isAuthority: true, startTime: 0, durationSec: 100, difficulty: 'dummy' });
  e.update(10, { x: 0, y: 0 });
  const before = e.timeLeftMs;
  e.completeTask(e.local!, 0);
  assert.equal(before - e.timeLeftMs, TASK_TIME_BONUS_SEC * 1000);
  e.completeTask(e.getPlayer('bot1')!, 1);
  assert.equal(before - e.timeLeftMs, TASK_TIME_BONUS_SEC * 2000, 'tasks by any survivor count');
  for (let i = 2; i < 40; i++) e.completeTask(e.local!, i);
  assert.ok(e.timeLeftMs >= 100 * 1000 * (1 - TASK_TIME_MAX_SHARE) - 100, 'never cuts more than the cap');
});
