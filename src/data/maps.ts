import type { GameMap } from '../types.ts';
import { T } from '../types.ts';
import { generateRows, scaleRows } from './mapGen.ts';

// ASCII legend used by built-in maps and the map editor export:
//  # wall   . floor   C crate   T task station   S survivor spawn   Z zombie spawn
//  ^ hazard (spikes)  F finish  ~ mud (slow)     K checkpoint       O moving saw
export const ASCII_TO_TILE: Record<string, number> = {
  '#': T.WALL,
  '.': T.FLOOR,
  C: T.CRATE,
  T: T.TASK,
  S: T.SURVIVOR_SPAWN,
  Z: T.ZOMBIE_SPAWN,
  '^': T.HAZARD,
  F: T.FINISH,
  '~': T.MUD,
  K: T.CHECKPOINT,
  O: T.SAW,
};

export const TILE_TO_ASCII: Record<number, string> = Object.fromEntries(
  Object.entries(ASCII_TO_TILE).map(([k, v]) => [v, k]),
);

export function mapFromAscii(
  id: string,
  name: string,
  rows: string[],
  kind: GameMap['kind'] = 'arena',
  extra: Partial<GameMap> = {},
): GameMap {
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const tiles: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x] ?? '#';
      tiles.push(ASCII_TO_TILE[ch] ?? T.FLOOR);
    }
  }
  return { id, name, author: 'Zombie Outbreak', width, height, tiles, kind, builtIn: true, ...extra };
}

export function mapToAscii(map: GameMap): string[] {
  const rows: string[] = [];
  for (let y = 0; y < map.height; y++) {
    let row = '';
    for (let x = 0; x < map.width; x++) row += TILE_TO_ASCII[map.tiles[y * map.width + x]] ?? '.';
    rows.push(row);
  }
  return rows;
}

export const HOSPITAL_ROWS = [
  '################################',
  '#S....#.......T......#.......Z.#',
  '#.....#..............#.........#',
  '#..T..#....CC....CC..#....T....#',
  '#.....#..............#.........#',
  '###.#####.........######.#######',
  '#.......#....~~~~....#.........#',
  '#.T.....#....~~~~....#....C....#',
  '#.......#............#.........#',
  '#...........#....#.............#',
  '#...C.......#.T..#........T....#',
  '#...........#....#.............#',
  '#####.###########.####.#########',
  '#.......#.................#....#',
  '#..T....#....C......C.....#..T.#',
  '#.......#......S..........#....#',
  '#.......#.................#....#',
  '#...........T.......~~~........#',
  '#S.....CC..............Z.....S.#',
  '################################',
];

export const MALL_ROWS = [
  '################################',
  '#S.......#..........#.........S#',
  '#..T.....#....T.....#.....T....#',
  '#........#..........#..........#',
  '#...CC...####....####...CC.....#',
  '#..............................#',
  '#....#####..........#####......#',
  '#....#...T..........T...#......#',
  '#....#..................#..Z...#',
  '#.......................#......#',
  '#....#.......CCCC.......#......#',
  '#....#..................#......#',
  '#....######.......#######......#',
  '#..............~~..............#',
  '#..T......Z....~~.........T....#',
  '#..............................#',
  '#...####....####....####....####',
  '#...#..T....#.......#..T.......#',
  '#S..#.......#...S...#.........S#',
  '################################',
];

export const BASE_ROWS = [
  '################################',
  '#S.....C.......#.......C......S#',
  '#..............#...............#',
  '#..####..T.....#.....T..####...#',
  '#..#..#...............#....#...#',
  '#..#T.#....~~~~~~~~...#..T.#...#',
  '#..#..#....~~~~~~~~...#....#...#',
  '#..##.#...............##.###...#',
  '#........######.######.........#',
  '#..C.....#....Z.....#......C...#',
  '#........#..........#..........#',
  '#........###.####.###..........#',
  '#..............................#',
  '#####..####..........####..#####',
  '#.......#......T.......#.......#',
  '#..T....#..............#....T..#',
  '#.......#...CC....CC...#.......#',
  '#..............................#',
  '#S......C.......S......C......S#',
  '################################',
];

export const OBSTACLE_ROOKIE_ROWS = [
  '################################',
  '#S...#....^.....#.....O........#',
  '#....#....^.....#..............#',
  '#....#..........#....####......#',
  '#....####^^^....#..............#',
  '#.........^.....K.......O......#',
  '#.........^.....#..............#',
  '#######...###########^^^###..###',
  '#..............................#',
  '#..O.........O..........O......#',
  '#..............................#',
  '###..####################......#',
  '#......^.......~~~~~~~~........#',
  '#......^.......~~~~~~~~........#',
  '#K.....^...O...~~~~~~~~...^^^..#',
  '#..............~~~~~~~~...^F^..#',
  '#......^..................^.^..#',
  '#......^...........O...........#',
  '#..............................#',
  '################################',
];

export const OBSTACLE_SAW_ROWS = [
  '################################',
  '#S.....O.......O.......O.......#',
  '#..............................#',
  '#^^^^^^^^^^^^^^^^^^^^^^^^^^^...#',
  '#..............................#',
  '#...O.......O........O.........#',
  '#..............................#',
  '#...^^^^^^^^^^^^^^^^^^^^^^^^^^^#',
  '#K.............................#',
  '#......~~~~~~~O~~~~~~~~~.......#',
  '#..............................#',
  '#^^^^^^^^^^^^^^^^^^^^^^^^^^^...#',
  '#.............................K#',
  '#....O.....O.....O.....O.......#',
  '#..............................#',
  '#...^^^^^^^^^^^^^^^^^^^^^^^^^^^#',
  '#..............................#',
  '#..O.......O.......O.......O...#',
  '#.............................F#',
  '################################',
];

// The three hand-made arenas are doubled in size (64x40) with extra task stations;
// the rest are generated from a seed (rooms + corridors) and range up to 96x56.
export const BIG_HOSPITAL_ROWS = scaleRows(HOSPITAL_ROWS, 2, 10, 101);
export const BIG_MALL_ROWS = scaleRows(MALL_ROWS, 2, 10, 102);
export const BIG_BASE_ROWS = scaleRows(BASE_ROWS, 2, 10, 103);
export const LAB_ROWS = generateRows(11, 64, 40);
export const PRISON_ROWS = generateRows(23, 72, 44, { clutter: 0.8, loops: 0.5 });
export const CITY_ROWS = generateRows(37, 80, 48, { minLeaf: 12, mud: 0.35, loops: 0.5 });
export const BUNKER_ROWS = generateRows(51, 96, 56, { minLeaf: 12, clutter: 0.7, loops: 0.6 });

export const BUILT_IN_MAPS: GameMap[] = [
  mapFromAscii('hospital', 'בית חולים נטוש', BIG_HOSPITAL_ROWS),
  mapFromAscii('mall', 'הקניון המת', BIG_MALL_ROWS),
  mapFromAscii('base', 'מחנה צבאי', BIG_BASE_ROWS),
  mapFromAscii('lab', 'מעבדה סודית', LAB_ROWS),
  mapFromAscii('prison', 'כלא מחמירה', PRISON_ROWS),
  mapFromAscii('city', 'עיר רפאים', CITY_ROWS),
  mapFromAscii('bunker', 'בונקר ענק', BUNKER_ROWS),
  mapFromAscii('obstacle_rookie', 'מסלול טירונים', OBSTACLE_ROOKIE_ROWS, 'obstacle', { medalTimes: [30, 45, 70] }),
  mapFromAscii('obstacle_saw', 'עמק המסורים', OBSTACLE_SAW_ROWS, 'obstacle', { medalTimes: [35, 55, 80] }),
];

export function findBuiltInMap(id: string): GameMap | undefined {
  return BUILT_IN_MAPS.find((m) => m.id === id);
}

export function createBlankMap(width = 32, height = 20): number[] {
  const tiles: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      tiles.push(edge ? T.WALL : T.FLOOR);
    }
  }
  return tiles;
}
