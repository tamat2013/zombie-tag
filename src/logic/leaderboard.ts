// Global player leaderboard: one public row per player (Firestore `leaderboard/{uid}`), ranked by
// a chosen stat. Offline there is no server, so a fixed list of simulated players fills the board.
// No React Native imports, so the tests can run it in plain Node.
import type { Profile } from '../types.ts';

export type BoardMetric = 'xp' | 'wins' | 'infections' | 'tasks';

export const BOARD_METRICS: readonly BoardMetric[] = ['xp', 'wins', 'infections', 'tasks'];

/** The public part of a profile. Nothing private (email, coins, skins) ever goes in here. */
export interface PlayerBoardEntry {
  uid: string;
  name: string;
  xp: number;
  wins: number;
  infections: number;
  tasks: number;
  isBot?: boolean;
}

export const BOARD_SIZE = 50;
const NAME_MAX = 30;

export function boardEntryOf(p: Profile): PlayerBoardEntry {
  const whole = (n: number) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return {
    uid: p.uid,
    name: p.displayName.trim().slice(0, NAME_MAX) || 'Player',
    xp: whole(p.xp),
    wins: whole(p.stats.wins),
    infections: whole(p.stats.infections),
    tasks: whole(p.stats.tasksCompleted),
  };
}

/** Highest value first. Ties go to the player with more XP, then by uid so the order never flickers. */
export function sortBoard(entries: readonly PlayerBoardEntry[], metric: BoardMetric): PlayerBoardEntry[] {
  return [...entries].sort((a, b) => b[metric] - a[metric] || b.xp - a.xp || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
}

/** 1-based place of `uid`, or 0 when the player is not on the board. */
export function rankIn(entries: readonly PlayerBoardEntry[], metric: BoardMetric, uid: string): number {
  return sortBoard(entries, metric).findIndex((e) => e.uid === uid) + 1;
}

const SIMULATED_NAMES = ['ZombieKing', 'NightNinja', 'Survivor99', 'DrDeath', 'BrainEater', 'TheShadow', 'Rex_IL', 'ZombieQueen', 'Speedy', 'SuperHero', 'Mike_Z', 'LastOneLeft'];

/** Players for the offline board. The same every time, so the board does not jump around. */
export function simulatedPlayers(): PlayerBoardEntry[] {
  return SIMULATED_NAMES.map((name, i) => {
    const xp = Math.round(9000 / (1 + i * 0.55) + ((i * 37) % 11) * 15);
    return {
      uid: `rival-${i}`,
      name,
      xp,
      wins: Math.round(xp / 55 + ((i * 7) % 5)),
      infections: Math.round(xp / 22 + ((i * 11) % 9)),
      tasks: Math.round(xp / 16 + ((i * 13) % 7)),
      isBot: true,
    };
  });
}

/** What the screen draws: the best `size` players with a value above zero, plus the local player when they fall below the cut. */
export interface BoardView {
  rows: (PlayerBoardEntry & { rank: number })[];
  /** The local player's place, 0 when their value is zero. */
  ownRank: number;
}

export function buildBoardView(entries: readonly PlayerBoardEntry[], metric: BoardMetric, own: PlayerBoardEntry, ownRank: number, size = BOARD_SIZE): BoardView {
  const ranked = sortBoard(entries, metric)
    .filter((e) => e[metric] > 0)
    .slice(0, size)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  const inList = ranked.some((e) => e.uid === own.uid);
  if (!inList && own[metric] > 0 && ownRank > 0) ranked.push({ ...own, rank: ownRank });
  return { rows: ranked, ownRank: own[metric] > 0 ? ownRank : 0 };
}
