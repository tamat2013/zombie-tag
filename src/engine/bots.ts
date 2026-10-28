import type { AbilityId, BotDifficulty, GameMap } from '../types.ts';
import { AbilityManager } from './abilities.ts';
import type { AbilityWorld } from './abilities.ts';
import { TASK_USE_RANGE, TILE } from './constants.ts';
import type { BotBrain, EnginePlayer } from './entities.ts';
import { hasLineOfSight, isSolid, tileAt, tileCenter, toTile, walkableTiles } from './map.ts';
import type { TaskStation, Vec } from './map.ts';
import { findPath } from './pathfinding.ts';

export interface BotLevel {
  speed: number;
  vision: number;
  /** Seconds between decisions (lower is sharper). */
  think: number;
  /** Chance per decision to use the recommended ability. */
  abilityChance: number;
  /** Distance at which a working survivor bot drops its task and runs. */
  panicDistance: number;
}

export const BOT_LEVELS: Record<BotDifficulty, BotLevel> = {
  dummy: { speed: 0, vision: 0, think: 1, abilityChance: 0, panicDistance: 0 },
  easy: { speed: 0.78, vision: 0.7, think: 0.8, abilityChance: 0.25, panicDistance: 110 },
  normal: { speed: 0.9, vision: 0.9, think: 0.45, abilityChance: 0.6, panicDistance: 220 },
  hard: { speed: 0.98, vision: 1, think: 0.25, abilityChance: 0.95, panicDistance: 300 },
};

export const BOT_NAMES = ['רקס', 'נועה', 'בוטי', 'זיגי', 'מקס', 'ליה', 'טורבו', 'פיקסל', 'שדו', 'אורי', 'סקאר', 'מיקה', 'גרים', 'דנה', 'וולף'];

export const TASK_DURATION_SEC: Record<string, number> = {
  wires: 4,
  machine: 5,
  download: 6,
  trash: 3.5,
  temperature: 4,
};

export interface BotWorld extends AbilityWorld {
  map: GameMap;
  stations: TaskStation[];
  rng(): number;
  completeTask(p: EnginePlayer, stationIndex: number): void;
  activateAbility(p: EnginePlayer, id: AbilityId): void;
}

export interface BotIntent {
  x: number;
  y: number;
}

function newBrain(now: number, p: EnginePlayer): BotBrain {
  return { mode: 'idle', path: [], repathAt: 0, nextThinkAt: now, stuck: { x: p.x, y: p.y, at: now } };
}

function steer(p: EnginePlayer, brain: BotBrain): BotIntent {
  while (brain.path.length && Math.hypot(brain.path[0].x - p.x, brain.path[0].y - p.y) < 10) brain.path.shift();
  const next = brain.path[0] ?? brain.goal;
  if (!next) return { x: 0, y: 0 };
  const dx = next.x - p.x;
  const dy = next.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return { x: 0, y: 0 };
  return { x: dx / d, y: dy / d };
}

function pathTo(world: BotWorld, p: EnginePlayer, brain: BotBrain, goal: Vec) {
  const path = findPath(world.map, { tx: toTile(p.x), ty: toTile(p.y) }, { tx: toTile(goal.x), ty: toTile(goal.y) });
  brain.goal = goal;
  brain.path = path ?? [];
  if (path && path.length) brain.path[brain.path.length - 1] = { x: goal.x, y: goal.y };
}

/** Free tile next to a station that is closest to the player. */
function stationApproach(map: GameMap, s: TaskStation, from: EnginePlayer): Vec | null {
  let best: Vec | null = null;
  let bestD = Infinity;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (isSolid(tileAt(map, s.tx + dx, s.ty + dy))) continue;
    const c = tileCenter(s.tx + dx, s.ty + dy);
    const d = Math.hypot(c.x - from.x, c.y - from.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function randomFloor(world: BotWorld): Vec {
  const tiles = walkableTiles(world.map);
  const t = tiles[Math.floor(world.rng() * tiles.length)];
  return tileCenter(t.x, t.y);
}

function pickFleeGoal(world: BotWorld, p: EnginePlayer, threats: EnginePlayer[]): Vec {
  let best: Vec | null = null;
  let bestScore = -Infinity;
  const tx0 = toTile(p.x);
  const ty0 = toTile(p.y);
  for (let i = 0; i < 18; i++) {
    const r = 3 + world.rng() * 6;
    const a = world.rng() * Math.PI * 2;
    const tx = Math.round(tx0 + Math.cos(a) * r);
    const ty = Math.round(ty0 + Math.sin(a) * r);
    if (isSolid(tileAt(world.map, tx, ty))) continue;
    const c = tileCenter(tx, ty);
    const minThreat = Math.min(...threats.map((t) => Math.hypot(t.x - c.x, t.y - c.y)));
    // Prefer spots far from zombies and not "through" them.
    const towardThreat = threats.some((t) => Math.hypot(t.x - c.x, t.y - c.y) < Math.hypot(t.x - p.x, t.y - p.y));
    const score = minThreat - (towardThreat ? 400 : 0) - Math.hypot(c.x - p.x, c.y - p.y) * 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (best) return best;
  const t = threats[0];
  const dx = p.x - t.x;
  const dy = p.y - t.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / d) * TILE * 4, y: p.y + (dy / d) * TILE * 4 };
}

function maybeUseAbility(world: BotWorld, p: EnginePlayer, level: BotLevel, now: number) {
  if (level.abilityChance <= 0) return;
  const suggestion = AbilityManager.suggest(world, p, now);
  if (suggestion && world.rng() < level.abilityChance) world.activateAbility(p, suggestion);
}

function nearestPatient(world: BotWorld, p: EnginePlayer, level: BotLevel, now: number): EnginePlayer | null {
  let best: EnginePlayer | null = null;
  let bestD = 400 * level.vision;
  for (const o of world.players) {
    if (!world.isFrozen(o, now) || o.startRole !== 'survivor' || !world.canSee(p, o, now)) continue;
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

function thinkSurvivor(world: BotWorld, p: EnginePlayer, brain: BotBrain, level: BotLevel, now: number): BotIntent {
  const threats = world.players.filter(
    (o) => o.role === 'zombie' && !world.isFrozen(o, now) && world.canSee(p, o, now) && Math.hypot(o.x - p.x, o.y - p.y) < 300 * level.vision,
  );
  const nearestThreat = Math.min(Infinity, ...threats.map((t) => Math.hypot(t.x - p.x, t.y - p.y)));

  if (brain.mode === 'work') {
    if (nearestThreat < level.panicDistance) {
      p.inTask = false;
      brain.mode = 'flee';
      brain.repathAt = 0;
    } else if (p.doctor && nearestPatient(world, p, level, now)) {
      // Drop the task to go heal.
      p.inTask = false;
      brain.mode = 'idle';
      brain.stationIndex = undefined;
    } else {
      if (now >= (brain.workUntil ?? 0) && brain.stationIndex !== undefined) {
        world.completeTask(p, brain.stationIndex);
        p.inTask = false;
        brain.mode = 'idle';
        brain.stationIndex = undefined;
      }
      return { x: 0, y: 0 };
    }
  }

  if (threats.length) {
    if (brain.mode !== 'flee' || now >= brain.repathAt || !brain.path.length) {
      brain.mode = 'flee';
      pathTo(world, p, brain, pickFleeGoal(world, p, threats));
      brain.repathAt = now + 700 * level.think + 250;
    }
    maybeUseAbility(world, p, level, now);
    return steer(p, brain);
  }

  if (brain.mode === 'flee') brain.mode = 'idle';

  // Doctors run to heal a frozen zombie they can see.
  if (p.doctor) {
    const target = nearestPatient(world, p, level, now);
    if (target) {
      brain.mode = 'chase';
      brain.targetId = target.id;
      if (hasLineOfSight(world.map, p, target)) {
        brain.path = [];
        brain.goal = { x: target.x, y: target.y };
      } else if (now >= brain.repathAt || !brain.path.length) {
        pathTo(world, p, brain, { x: target.x, y: target.y });
        brain.repathAt = now + 500;
      }
      return steer(p, brain);
    }
    if (brain.mode === 'chase') brain.mode = 'idle';
  }

  if (brain.mode === 'task' && brain.stationIndex !== undefined) {
    const s = world.stations[brain.stationIndex];
    if (Math.hypot(s.x - p.x, s.y - p.y) <= TASK_USE_RANGE) {
      brain.mode = 'work';
      p.inTask = true;
      brain.workUntil = now + ((TASK_DURATION_SEC[s.type] ?? 4) * 1000) / p.mods.task;
      return { x: 0, y: 0 };
    }
    if (!brain.path.length && now >= brain.repathAt) brain.mode = 'idle';
    return steer(p, brain);
  }

  if (brain.mode === 'idle' || (brain.mode === 'wander' && !brain.path.length)) {
    const todo = world.stations
      .filter((s) => !p.completedStations.includes(s.index))
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    // Slight randomness so bots don't all queue at the same console.
    const pick = todo[Math.min(todo.length - 1, Math.floor(world.rng() * 2))];
    const approach = pick ? stationApproach(world.map, pick, p) : null;
    if (pick && approach) {
      brain.mode = 'task';
      brain.stationIndex = pick.index;
      pathTo(world, p, brain, approach);
      brain.repathAt = now + 1500;
    } else {
      brain.mode = 'wander';
      pathTo(world, p, brain, randomFloor(world));
    }
  }
  if (world.rng() < 0.05) maybeUseAbility(world, p, level, now);
  return steer(p, brain);
}

function thinkZombie(world: BotWorld, p: EnginePlayer, brain: BotBrain, level: BotLevel, now: number): BotIntent {
  if (world.isFrozen(p, now)) return { x: 0, y: 0 };
  const visible = world.players.filter((o) => o.role === 'survivor' && world.canSee(p, o, now));
  if (visible.length) {
    const target = visible.reduce((a, b) => (Math.hypot(a.x - p.x, a.y - p.y) <= Math.hypot(b.x - p.x, b.y - p.y) ? a : b));
    brain.mode = 'chase';
    brain.targetId = target.id;
    brain.lastSeen = { x: target.x, y: target.y, at: now };
    maybeUseAbility(world, p, level, now);
    if (hasLineOfSight(world.map, p, target)) {
      brain.path = [];
      brain.goal = { x: target.x, y: target.y };
      return steer(p, brain);
    }
    if (now >= brain.repathAt || !brain.path.length) {
      pathTo(world, p, brain, { x: target.x, y: target.y });
      brain.repathAt = now + 500 * level.think + 150;
    }
    return steer(p, brain);
  }
  if (brain.lastSeen && now - brain.lastSeen.at < 5000) {
    if (brain.mode !== 'hunt') {
      brain.mode = 'hunt';
      pathTo(world, p, brain, brain.lastSeen);
    }
    if (!brain.path.length && Math.hypot(brain.lastSeen.x - p.x, brain.lastSeen.y - p.y) < 20) brain.lastSeen = undefined;
    return steer(p, brain);
  }
  if (world.rng() < 0.04) maybeUseAbility(world, p, level, now);
  if (brain.mode !== 'wander' || !brain.path.length) {
    brain.mode = 'wander';
    // Patrol task consoles half the time: that's where survivors gather.
    const s = world.stations.length && world.rng() < 0.5 ? world.stations[Math.floor(world.rng() * world.stations.length)] : null;
    const goal = s ? stationApproach(world.map, s, p) ?? randomFloor(world) : randomFloor(world);
    pathTo(world, p, brain, goal);
  }
  return steer(p, brain);
}

export function updateBot(world: BotWorld, p: EnginePlayer, now: number): BotIntent {
  const level = BOT_LEVELS[p.difficulty];
  if (level.speed === 0) return { x: 0, y: 0 };
  if (!p.brain) p.brain = newBrain(now, p);
  const brain = p.brain;
  // Stuck detection: if we haven't moved for a while, drop the path.
  if (now - brain.stuck.at > 1200) {
    if (Math.hypot(brain.stuck.x - p.x, brain.stuck.y - p.y) < 6 && brain.mode !== 'work') {
      brain.path = [];
      brain.repathAt = 0;
      if (brain.mode === 'task' || brain.mode === 'wander') brain.mode = 'idle';
    }
    brain.stuck = { x: p.x, y: p.y, at: now };
  }
  const intent = p.role === 'survivor' ? thinkSurvivor(world, p, brain, level, now) : thinkZombie(world, p, brain, level, now);
  return { x: intent.x * level.speed, y: intent.y * level.speed };
}

export function resetBrain(p: EnginePlayer) {
  p.brain = undefined;
  p.inTask = false;
}
