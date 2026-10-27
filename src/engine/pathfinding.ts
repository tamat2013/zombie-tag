import type { GameMap } from '../types.ts';
import { T } from '../types.ts';
import { isSolid, tileAt, tileCenter } from './map.ts';
import type { Vec } from './map.ts';

/** Binary min-heap keyed by f-score. */
class Heap {
  items: { i: number; f: number }[] = [];
  push(i: number, f: number) {
    const a = this.items;
    a.push({ i, f });
    let n = a.length - 1;
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (a[p].f <= a[n].f) break;
      [a[p], a[n]] = [a[n], a[p]];
      n = p;
    }
  }
  pop(): number | undefined {
    const a = this.items;
    if (!a.length) return undefined;
    const top = a[0].i;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let n = 0;
      for (;;) {
        const l = n * 2 + 1;
        const r = l + 1;
        let m = n;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === n) break;
        [a[m], a[n]] = [a[n], a[m]];
        n = m;
      }
    }
    return top;
  }
  get size() {
    return this.items.length;
  }
}

function passable(map: GameMap, tx: number, ty: number, avoidHazards: boolean): boolean {
  const c = tileAt(map, tx, ty);
  if (isSolid(c)) return false;
  if (avoidHazards && (c === T.HAZARD || c === T.SAW)) return false;
  return true;
}

/**
 * 8-directional A* over the tile grid without corner cutting.
 * Returns world-space waypoints (tile centers), excluding the start tile.
 */
export function findPath(
  map: GameMap,
  start: { tx: number; ty: number },
  goal: { tx: number; ty: number },
  avoidHazards = true,
  maxExpanded = 2500,
): Vec[] | null {
  const W = map.width;
  const H = map.height;
  if (!passable(map, goal.tx, goal.ty, false)) return null;
  const startI = start.ty * W + start.tx;
  const goalI = goal.ty * W + goal.tx;
  if (startI === goalI) return [];
  const g = new Float32Array(W * H).fill(Infinity);
  const from = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  const heap = new Heap();
  const h = (i: number) => {
    const dx = Math.abs((i % W) - goal.tx);
    const dy = Math.abs(Math.floor(i / W) - goal.ty);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  g[startI] = 0;
  heap.push(startI, h(startI));
  let expanded = 0;
  while (heap.size) {
    const cur = heap.pop()!;
    if (cur === goalI) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++expanded > maxExpanded) return null;
    const cx = cur % W;
    const cy = Math.floor(cur / W);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!passable(map, nx, ny, avoidHazards && nx + ny * W !== goalI)) continue;
        if (dx && dy && (!passable(map, cx + dx, cy, avoidHazards) || !passable(map, cx, cy + dy, avoidHazards))) continue;
        const ni = ny * W + nx;
        if (closed[ni]) continue;
        const mud = tileAt(map, nx, ny) === T.MUD ? 1.6 : 1;
        const cost = g[cur] + (dx && dy ? 1.414 : 1) * mud;
        if (cost < g[ni]) {
          g[ni] = cost;
          from[ni] = cur;
          heap.push(ni, cost + h(ni));
        }
      }
    }
  }
  if (from[goalI] < 0) return null;
  const path: Vec[] = [];
  for (let i = goalI; i !== startI; i = from[i]) path.push(tileCenter(i % W, Math.floor(i / W)));
  return path.reverse();
}
