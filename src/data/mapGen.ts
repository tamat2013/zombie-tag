// Helpers that build big ASCII maps: scale a hand-made map up, or generate rooms + corridors from a seed.
// Everything is deterministic (seeded), so every device builds the exact same map.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POINT_TILES = new Set(['T', 'S', 'Z', 'K', 'F', 'O']);

/** Scale a map up by `k`. Single-point tiles (task, spawn...) stay single; walls, crates and mud grow. */
export function scaleRows(rows: string[], k: number, extraTasks = 0, seed = 1): string[] {
  const out: string[][] = [];
  for (const row of rows) {
    for (let dy = 0; dy < k; dy++) {
      const line: string[] = [];
      for (const ch of row) {
        for (let dx = 0; dx < k; dx++) line.push(POINT_TILES.has(ch) && (dx > 0 || dy > 0) ? '.' : ch);
      }
      out.push(line);
    }
  }
  // The same number of tasks in 4x the space feels empty, so add some in open floor.
  const rng = mulberry32(seed);
  const open = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (out[y + dy]?.[x + dx] !== '.') return false;
    return true;
  };
  const marks: { x: number; y: number }[] = [];
  out.forEach((r, y) => r.forEach((c, x) => (c === 'T' || c === 'S' || c === 'Z') && marks.push({ x, y })));
  let placed = 0;
  for (let tries = 0; placed < extraTasks && tries < 4000; tries++) {
    const x = 2 + Math.floor(rng() * (out[0].length - 4));
    const y = 2 + Math.floor(rng() * (out.length - 4));
    if (!open(x, y) || marks.some((m) => Math.hypot(m.x - x, m.y - y) < 9)) continue;
    out[y][x] = 'T';
    marks.push({ x, y });
    placed++;
  }
  return out.map((r) => r.join(''));
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

interface GenOptions {
  /** Smallest area a split may produce (bigger = fewer, larger rooms). */
  minLeaf?: number;
  /** Chance that a room gets a pillar block or crates. */
  clutter?: number;
  /** Chance of a mud patch in a room. */
  mud?: number;
  /** Extra corridors that make loops, as a share of the room count. */
  loops?: number;
}

/** Rooms-and-corridors map (BSP). Always connected; the tests re-check that. */
export function generateRows(seed: number, W: number, H: number, opts: GenOptions = {}): string[] {
  const rng = mulberry32(seed);
  const { minLeaf = 11, clutter = 0.6, mud = 0.2, loops = 0.35 } = opts;
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('#'));
  const set = (x: number, y: number, c: string) => {
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y][x] = c;
  };
  const rooms: Room[] = [];

  const carve = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, '.');
  };
  const corridor = (a: Room, b: Room) => {
    const x1 = Math.min(a.cx, b.cx);
    const x2 = Math.max(a.cx, b.cx);
    carve(x1, a.cy, x2 - x1 + 2, 2);
    const y1 = Math.min(a.cy, b.cy);
    const y2 = Math.max(a.cy, b.cy);
    carve(b.cx, y1, 2, y2 - y1 + 2);
  };

  // Returns the rooms inside this region.
  const split = (x: number, y: number, w: number, h: number): Room[] => {
    const canV = w >= minLeaf * 2;
    const canH = h >= minLeaf * 2;
    const tooBig = w > minLeaf * 2.2 || h > minLeaf * 1.8;
    if ((canV || canH) && (tooBig || rng() < 0.3)) {
      const vertical = canV && (!canH || (w > h * 1.25 ? true : h > w * 1.25 ? false : rng() < 0.5));
      const len = vertical ? w : h;
      const at = minLeaf + Math.floor(rng() * (len - minLeaf * 2 + 1));
      const left = vertical ? split(x, y, at, h) : split(x, y, w, at);
      const right = vertical ? split(x + at, y, w - at, h) : split(x, y + at, w, h - at);
      corridor(left[Math.floor(rng() * left.length)], right[Math.floor(rng() * right.length)]);
      return [...left, ...right];
    }
    const rx = x + 1 + Math.floor(rng() * 2);
    const ry = y + 1 + Math.floor(rng() * 2);
    const rw = Math.max(6, w - 2 - Math.floor(rng() * 3) - (rx - x - 1));
    const rh = Math.max(6, h - 2 - Math.floor(rng() * 3) - (ry - y - 1));
    carve(rx, ry, rw, rh);
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2) - 1, cy: ry + Math.floor(rh / 2) - 1 };
    rooms.push(room);
    return [room];
  };
  split(0, 0, W, H);

  // Loops, so a chase has more than one way around.
  for (let i = 0; i < Math.floor(rooms.length * loops); i++) {
    const a = rooms[Math.floor(rng() * rooms.length)];
    const near = [...rooms].filter((r) => r !== a).sort((p, q) => Math.hypot(p.cx - a.cx, p.cy - a.cy) - Math.hypot(q.cx - a.cx, q.cy - a.cy));
    corridor(a, near[Math.floor(rng() * Math.min(3, near.length))]);
  }

  const free = (x: number, y: number) => g[y]?.[x] === '.';
  // Keeps the two corridor lines through a room's middle clear.
  const onLane = (r: Room, x: number, y: number) => (x >= r.cx && x <= r.cx + 1) || (y >= r.cy && y <= r.cy + 1);

  for (const r of rooms) {
    if (rng() < clutter) {
      const cx = r.x + 2 + Math.floor(rng() * Math.max(1, r.w - 5));
      const cy = r.y + 2 + Math.floor(rng() * Math.max(1, r.h - 5));
      const size = rng() < 0.5 ? 2 : 1;
      for (let dy = 0; dy < size; dy++)
        for (let dx = 0; dx < size; dx++) if (free(cx + dx, cy + dy) && !onLane(r, cx + dx, cy + dy)) g[cy + dy][cx + dx] = rng() < 0.7 ? 'C' : '#';
    }
    if (r.w >= 9 && r.h >= 8 && rng() < mud) {
      const mx = r.x + 2 + Math.floor(rng() * (r.w - 6));
      const my = r.y + 2 + Math.floor(rng() * (r.h - 5));
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) if (free(mx + dx, my + dy) && !onLane(r, mx + dx, my + dy)) g[my + dy][mx + dx] = '~';
    }
  }

  const put = (r: Room, ch: string, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      const x = r.x + 1 + Math.floor(rng() * (r.w - 2));
      const y = r.y + 1 + Math.floor(rng() * (r.h - 2));
      if (free(x, y) && !onLane(r, x, y)) {
        g[y][x] = ch;
        return true;
      }
    }
    return false;
  };

  // Tasks: bigger rooms get two.
  for (const r of rooms) {
    const n = r.w * r.h >= 90 ? 2 : 1;
    for (let i = 0; i < n; i++) if (rng() < 0.85) put(r, 'T');
  }

  // Zombies start near the middle, survivors spread to the far rooms.
  const mx = W / 2;
  const my = H / 2;
  const byCenter = [...rooms].sort((a, b) => Math.hypot(a.cx - mx, a.cy - my) - Math.hypot(b.cx - mx, b.cy - my));
  const zombieRooms = byCenter.slice(0, Math.max(2, Math.round(rooms.length / 6)));
  const survivorRooms = byCenter.slice(-Math.max(4, Math.round(rooms.length / 3)));
  for (const r of zombieRooms) for (let i = 0; i < 2; i++) put(r, 'Z');
  for (const r of survivorRooms) for (let i = 0; i < 2; i++) put(r, 'S');

  return g.map((r) => r.join(''));
}
