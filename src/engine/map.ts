import type { GameMap, TaskType } from '../types.ts';
import { T } from '../types.ts';
import { PLAYER_RADIUS, SAW_SPAN_TILES, TILE } from './constants.ts';

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TaskStation {
  index: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  type: TaskType;
}

export interface Saw {
  originX: number;
  y: number;
  minX: number;
  maxX: number;
  phase: number;
}

export const TASK_TYPES: TaskType[] = ['wires', 'machine', 'download', 'trash', 'temperature'];

export function tileAt(map: GameMap, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return T.WALL;
  return map.tiles[ty * map.width + tx];
}

/** Tiles that block movement. Task stations are solid consoles you stand next to. */
export function isSolid(code: number): boolean {
  return code === T.WALL || code === T.CRATE || code === T.TASK;
}

/** Tiles that block line of sight. Crates and consoles are low, so you can see over them. */
export function blocksSight(code: number): boolean {
  return code === T.WALL;
}

export function tileCenter(tx: number, ty: number): Vec {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function toTile(v: number): number {
  return Math.floor(v / TILE);
}

export function findTiles(map: GameMap, code: number): Vec[] {
  const out: Vec[] = [];
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.tiles[ty * map.width + tx] === code) out.push({ x: tx, y: ty });
    }
  }
  return out;
}

export function getTaskStations(map: GameMap): TaskStation[] {
  return findTiles(map, T.TASK).map((t, i) => {
    const c = tileCenter(t.x, t.y);
    return { index: i, tx: t.x, ty: t.y, x: c.x, y: c.y, type: TASK_TYPES[i % TASK_TYPES.length] };
  });
}

export function getSpawns(map: GameMap, code: number): Vec[] {
  const spawns = findTiles(map, code).map((t) => tileCenter(t.x, t.y));
  if (spawns.length > 0) return spawns;
  // Fallback: any walkable tile.
  const floors = walkableTiles(map);
  return floors.length ? [tileCenter(floors[0].x, floors[0].y)] : [{ x: TILE * 1.5, y: TILE * 1.5 }];
}

export function walkableTiles(map: GameMap): Vec[] {
  const out: Vec[] = [];
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const c = map.tiles[ty * map.width + tx];
      if (!isSolid(c) && c !== T.HAZARD && c !== T.SAW) out.push({ x: tx, y: ty });
    }
  }
  return out;
}

export function getSaws(map: GameMap): Saw[] {
  return findTiles(map, T.SAW).map((t, i) => {
    let minTx = t.x;
    let maxTx = t.x;
    while (minTx - 1 >= t.x - SAW_SPAN_TILES && !isSolid(tileAt(map, minTx - 1, t.y))) minTx--;
    while (maxTx + 1 <= t.x + SAW_SPAN_TILES && !isSolid(tileAt(map, maxTx + 1, t.y))) maxTx++;
    return {
      originX: tileCenter(t.x, t.y).x,
      y: tileCenter(t.x, t.y).y,
      minX: tileCenter(minTx, t.y).x,
      maxX: tileCenter(maxTx, t.y).x,
      phase: (i * 0.37) % 1,
    };
  });
}

export function sawPosition(saw: Saw, timeSec: number, periodSec: number): Vec {
  const t = ((timeSec / periodSec + saw.phase) % 1) * Math.PI * 2;
  const mid = (saw.minX + saw.maxX) / 2;
  const amp = (saw.maxX - saw.minX) / 2;
  return { x: mid + Math.sin(t) * amp, y: saw.y };
}

/** Pushes a circle out of any solid tiles it overlaps. Mutates and returns pos. */
export function resolveCollision(map: GameMap, pos: Vec, radius = PLAYER_RADIUS): Vec {
  const minTx = toTile(pos.x - radius);
  const maxTx = toTile(pos.x + radius);
  const minTy = toTile(pos.y - radius);
  const maxTy = toTile(pos.y + radius);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isSolid(tileAt(map, tx, ty))) continue;
      const rx = tx * TILE;
      const ry = ty * TILE;
      const cx = Math.max(rx, Math.min(pos.x, rx + TILE));
      const cy = Math.max(ry, Math.min(pos.y, ry + TILE));
      let dx = pos.x - cx;
      let dy = pos.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      if (d2 === 0) {
        // Center is inside the tile: push out along the shortest axis.
        const left = pos.x - rx;
        const right = rx + TILE - pos.x;
        const top = pos.y - ry;
        const bottom = ry + TILE - pos.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) pos.x = rx - radius;
        else if (m === right) pos.x = rx + TILE + radius;
        else if (m === top) pos.y = ry - radius;
        else pos.y = ry + TILE + radius;
        continue;
      }
      const d = Math.sqrt(d2);
      dx /= d;
      dy /= d;
      pos.x = cx + dx * radius;
      pos.y = cy + dy * radius;
    }
  }
  return pos;
}

/** Moves a circle by (dx, dy) with axis-separated collision so it slides along walls. */
export function moveWithCollision(map: GameMap, pos: Vec, dx: number, dy: number, radius = PLAYER_RADIUS): Vec {
  // Sub-step so fast movement never tunnels through a tile.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (radius * 0.5)));
  for (let i = 0; i < steps; i++) {
    pos.x += dx / steps;
    resolveCollision(map, pos, radius);
    pos.y += dy / steps;
    resolveCollision(map, pos, radius);
  }
  return pos;
}

/** Grid ray-march line of sight between two world points. */
export function hasLineOfSight(map: GameMap, a: Vec, b: Vec): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.ceil(dist / (TILE / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (blocksSight(tileAt(map, toTile(x), toTile(y)))) return false;
  }
  return true;
}

/** Merges solid tiles of one code into horizontal runs, to render far fewer views. */
export function mergeTiles(map: GameMap, code: number): Rect[] {
  const rects: Rect[] = [];
  for (let ty = 0; ty < map.height; ty++) {
    let start = -1;
    for (let tx = 0; tx <= map.width; tx++) {
      const match = tx < map.width && map.tiles[ty * map.width + tx] === code;
      if (match && start < 0) start = tx;
      if (!match && start >= 0) {
        rects.push({ x: start * TILE, y: ty * TILE, w: (tx - start) * TILE, h: TILE });
        start = -1;
      }
    }
  }
  return rects;
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function worldSize(map: GameMap): { w: number; h: number } {
  return { w: map.width * TILE, h: map.height * TILE };
}

export interface MapValidation {
  ok: boolean;
  errors: string[];
}

/** Checks a map is playable: spawns exist and every station/finish is reachable. */
export function validateMap(map: GameMap): MapValidation {
  const errors: string[] = [];
  const survivorSpawns = findTiles(map, T.SURVIVOR_SPAWN);
  if (survivorSpawns.length === 0) errors.push('Missing a survivor spawn (S)');
  if (map.kind === 'arena') {
    if (findTiles(map, T.ZOMBIE_SPAWN).length === 0) errors.push('Missing a zombie spawn (Z)');
    if (findTiles(map, T.TASK).length < 3) errors.push('Needs at least 3 task stations (T)');
  } else if (findTiles(map, T.FINISH).length === 0) {
    errors.push('Missing a finish line (F)');
  }
  if (survivorSpawns.length > 0) {
    const reach = floodFill(map, survivorSpawns[0]);
    const unreachableTask = findTiles(map, T.TASK).some(
      (t) => ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(`${t.x + dx},${t.y + dy}`)),
    );
    if (unreachableTask) errors.push('A task station cannot be reached');
    const unreachableZ = findTiles(map, T.ZOMBIE_SPAWN).some((t) => !reach.has(`${t.x},${t.y}`));
    if (unreachableZ) errors.push('A zombie spawn is cut off from the rest of the map');
    const finish = findTiles(map, T.FINISH);
    if (finish.length && !finish.some((t) => reach.has(`${t.x},${t.y}`))) errors.push('The finish line cannot be reached');
  }
  return { ok: errors.length === 0, errors };
}

/** Walkable tiles reachable from a start tile (hazards count as walkable here). */
export function floodFill(map: GameMap, start: Vec): Set<string> {
  const seen = new Set<string>([`${start.x},${start.y}`]);
  const queue: Vec[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || isSolid(tileAt(map, nx, ny))) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}
