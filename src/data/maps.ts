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

﻿export const OBSTACLE_SNAKE_ROWS = [
  '################################',
  '#S...........^.......O.........#',
  '#..............................#',
  '############################...#',
  '#..............................#',
  '#...O.......^^^.......O........#',
  '#..............................#',
  '#...############################',
  '#K.............................#',
  '#.....~~~~~~~~~~~~~~~~~~.......#',
  '#..........O.........O.........#',
  '############################...#',
  '#.............................K#',
  '#....^.....^.....^.....^.......#',
  '#..O.....O.....O.....O.........#',
  '#...############################',
  '#..............................#',
  '#.^.^.^.^.^.^.^.^.^.^.^.^.^.^.F#',
  '#..............................#',
  '################################',
];

export const OBSTACLE_MARSH_ROWS = [
  '################################',
  '#S....~~~~~~~~~~~~~~~~~~~~.....#',
  '#.....~~~~~~~~~^^~~~~~~~~~.....#',
  '#..^..~~~~~~~~~~~~~~~~~~~~..^..#',
  '#.....~~~~^^~~~~~~~~^^~~~~.....#',
  '###########~~~~~~~~~~###########',
  '#.........K~~~~~~~~~~..........#',
  '#..O......~~~~~~~~~~~......O...#',
  '#.........~~~^^~~~~~~..........#',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '#~~~^^~~~~~~~~O~~~~~~~~~^^~~~~~#',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '######################~~~~~~~~~#',
  '#.....................~~~~~~~K~#',
  '#..^^^^^^^^^^^^^^^^^..~~~~~~~~~#',
  '#..^...............^...........#',
  '#..^.......F.......^.....O.....#',
  '#..^.......................^...#',
  '#..............................#',
  '################################',
];

export const OBSTACLE_GAUNTLET_ROWS = [
  '################################',
  '#S..O....O....O....O....O......#',
  '#..............................#',
  '#..O....O....O....O....O....O..#',
  '#..............................#',
  '###########################....#',
  '#..............................#',
  '#.O..O..O..O..O..O..O..O..O....#',
  '#..............................#',
  '#....###########################',
  '#K.............................#',
  '#..^^..^^..^^..^^..^^..^^..^^..#',
  '#..............................#',
  '#..O...O...O...O...O...O...O...#',
  '###########################....#',
  '#.............................K#',
  '#....O.....O.....O.....O.......#',
  '#..............................#',
  '#F.....^.....^.....^.....^.....#',
  '################################',
];


// The three hand-made arenas are doubled in size (64x40) with extra task stations;
// the rest are generated from a seed (rooms + corridors) and range from 44x30 up to 100x60.
export const BIG_HOSPITAL_ROWS = scaleRows(HOSPITAL_ROWS, 2, 10, 101);
export const BIG_MALL_ROWS = scaleRows(MALL_ROWS, 2, 10, 102);
export const BIG_BASE_ROWS = scaleRows(BASE_ROWS, 2, 10, 103);
export const LAB_ROWS = generateRows(11, 64, 40);
export const PRISON_ROWS = generateRows(23, 72, 44, { clutter: 0.8, loops: 0.5 });
export const CITY_ROWS = generateRows(37, 80, 48, { minLeaf: 12, mud: 0.35, loops: 0.5 });
export const BUNKER_ROWS = generateRows(51, 96, 56, { minLeaf: 12, clutter: 0.7, loops: 0.6 });
export const ARCADE_ROWS = generateRows(251, 48, 32, { minLeaf: 9, clutter: 0.5, mud: 0, loops: 0.5 });
export const CABINS_ROWS = generateRows(263, 44, 30, { minLeaf: 8, clutter: 0.4, mud: 0.5, loops: 0.4 });
export const SCHOOL_ROWS = generateRows(61, 60, 38, { minLeaf: 10, clutter: 0.7 });
export const MANSION_ROWS = generateRows(113, 56, 56, { minLeaf: 9, clutter: 0.8, loops: 0.3 });
export const HOTEL_ROWS = generateRows(211, 64, 52, { minLeaf: 9, clutter: 0.7, mud: 0 });
export const FARM_ROWS = generateRows(89, 70, 46, { minLeaf: 13, clutter: 0.3, mud: 0.6, loops: 0.6 });
export const MINE_ROWS = generateRows(163, 64, 64, { minLeaf: 10, clutter: 0.5, mud: 0.5, loops: 0.2 });
export const SWAMP_ROWS = generateRows(197, 72, 48, { minLeaf: 12, clutter: 0.3, mud: 0.9, loops: 0.5 });
export const OFFICE_ROWS = generateRows(227, 80, 40, { minLeaf: 10, clutter: 0.9, mud: 0 });
export const SUBWAY_ROWS = generateRows(73, 92, 30, { minLeaf: 10, clutter: 0.4, loops: 0.7 });
export const SHIP_ROWS = generateRows(149, 96, 32, { minLeaf: 10, clutter: 0.6, mud: 0.1 });
export const STADIUM_ROWS = generateRows(181, 76, 60, { minLeaf: 15, clutter: 0.4, loops: 0.6 });
export const FACTORY_ROWS = generateRows(97, 84, 52, { minLeaf: 11, clutter: 0.9, mud: 0.3 });
export const SEWER_ROWS = generateRows(271, 90, 44, { minLeaf: 10, clutter: 0.3, mud: 0.7, loops: 0.8 });
export const AIRPORT_ROWS = generateRows(131, 100, 50, { minLeaf: 14, clutter: 0.5, loops: 0.6 });
export const CAMPUS_ROWS = generateRows(239, 100, 60, { minLeaf: 14, clutter: 0.6, mud: 0.25, loops: 0.5 });

export const BUILT_IN_MAPS: GameMap[] = [
  mapFromAscii('hospital', 'Abandoned Hospital', BIG_HOSPITAL_ROWS),
  mapFromAscii('mall', 'Dead Mall', BIG_MALL_ROWS),
  mapFromAscii('base', 'Army Camp', BIG_BASE_ROWS),
  mapFromAscii('lab', 'Secret Lab', LAB_ROWS),
  mapFromAscii('prison', 'Max Security Prison', PRISON_ROWS),
  mapFromAscii('city', 'Ghost Town', CITY_ROWS),
  mapFromAscii('bunker', 'Giant Bunker', BUNKER_ROWS),
  mapFromAscii('arcade', 'Neon Arcade', ARCADE_ROWS),
  mapFromAscii('cabins', 'Lake Cabins', CABINS_ROWS),
  mapFromAscii('school', 'Haunted School', SCHOOL_ROWS),
  mapFromAscii('mansion', 'Creepy Mansion', MANSION_ROWS),
  mapFromAscii('hotel', 'Grand Hotel', HOTEL_ROWS),
  mapFromAscii('farm', 'Infected Farm', FARM_ROWS),
  mapFromAscii('mine', 'Old Coal Mine', MINE_ROWS),
  mapFromAscii('swamp', 'Swamp Village', SWAMP_ROWS),
  mapFromAscii('office', 'Office Tower', OFFICE_ROWS),
  mapFromAscii('subway', 'Subway Tunnels', SUBWAY_ROWS),
  mapFromAscii('ship', 'Cruise Ship', SHIP_ROWS),
  mapFromAscii('stadium', 'Empty Stadium', STADIUM_ROWS),
  mapFromAscii('factory', 'Toxic Factory', FACTORY_ROWS),
  mapFromAscii('sewer', 'The Sewers', SEWER_ROWS),
  mapFromAscii('airport', 'Abandoned Airport', AIRPORT_ROWS),
  mapFromAscii('campus', 'University Campus', CAMPUS_ROWS),
  mapFromAscii('obstacle_rookie', 'Rookie Course', OBSTACLE_ROOKIE_ROWS, 'obstacle', { medalTimes: [30, 45, 70] }),
  mapFromAscii('obstacle_saw', 'Saw Valley', OBSTACLE_SAW_ROWS, 'obstacle', { medalTimes: [35, 55, 80] }),
  mapFromAscii('obstacle_snake', 'The Snake', OBSTACLE_SNAKE_ROWS, 'obstacle', { medalTimes: [50, 70, 100] }),
  mapFromAscii('obstacle_marsh', 'Mud Marsh', OBSTACLE_MARSH_ROWS, 'obstacle', { medalTimes: [45, 65, 95] }),
  mapFromAscii('obstacle_gauntlet', 'Saw Gauntlet', OBSTACLE_GAUNTLET_ROWS, 'obstacle', { medalTimes: [45, 65, 95] }),
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
