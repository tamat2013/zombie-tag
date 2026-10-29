// Shared types used by the engine, game logic, services and UI.
// This file must stay free of React Native imports (the engine is unit-tested in plain Node).

export type Role = 'survivor' | 'zombie';
export type GameMode = 'classic' | 'tournament' | 'obstacle' | 'training';
export type BotDifficulty = 'dummy' | 'easy' | 'normal' | 'hard';

export type TaskType = 'wires' | 'machine' | 'download' | 'trash' | 'temperature';

export type AbilityId =
  | 'sprint'
  | 'scan'
  | 'medic'
  | 'invisibility'
  | 'dash'
  | 'zombieVision'
  | 'roar'
  | 'smoke'
  | 'teleport'
  | 'frenzy'
  | 'leap';

export type UpgradeId = 'speed' | 'cooldown' | 'vision' | 'taskSpeed' | 'reach' | 'stealth';

export type SkinPowerId = 'swift' | 'healer' | 'tank' | 'ghost' | 'alpha' | 'hunter' | 'scout' | 'engineer' | 'master' | 'brute';

export type SkinPattern = 'none' | 'stripes' | 'spots' | 'split' | 'ring';
export type SkinEyes = 'round' | 'angry' | 'sleepy' | 'cyclops';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'exclusive';

export interface Skin {
  id: string;
  name: string;
  body: string;
  accent: string;
  eyes: SkinEyes;
  pattern: SkinPattern;
  accessory: string; // emoji, '' for none
  power?: SkinPowerId;
  price: number;
  /** When set, the skin is bought with medals instead of coins. */
  medalPrice?: number;
  rarity: Rarity;
  custom?: boolean;
}

// Tile codes for maps. Stored row-major in GameMap.tiles.
export const T = {
  FLOOR: 0,
  WALL: 1,
  CRATE: 2,
  TASK: 3,
  SURVIVOR_SPAWN: 4,
  ZOMBIE_SPAWN: 5,
  HAZARD: 6,
  FINISH: 7,
  MUD: 8,
  CHECKPOINT: 9,
  SAW: 10,
} as const;
export type TileCode = (typeof T)[keyof typeof T];

export interface GameMap {
  id: string;
  name: string;
  author: string;
  authorId?: string;
  width: number;
  height: number;
  tiles: number[];
  kind: 'arena' | 'obstacle';
  builtIn?: boolean;
  isPublic?: boolean;
  shareCode?: string;
  createdAt?: number;
  /** Obstacle course medal thresholds in seconds: [gold, silver, bronze] */
  medalTimes?: [number, number, number];
}

export interface PlayerStats {
  matchesPlayed: number;
  wins: number;
  survivorWins: number;
  zombieWins: number;
  tasksCompleted: number;
  infections: number;
  secondsSurvived: number;
  abilitiesUsed: number;
  obstacleRuns: number;
  obstacleGolds: number;
  tournamentMatches: number;
  skinsCreated: number;
  mapsCreated: number;
  wiresTasks: number;
  machineTasks: number;
  downloadTasks: number;
  trashTasks: number;
  temperatureTasks: number;
}

export type StatKey = keyof PlayerStats;

export interface MissionProgressState {
  dailyKey: string;
  dailyBaseline: PlayerStats;
  dailyClaimed: string[];
  weeklyKey: string;
  weeklyBaseline: PlayerStats;
  weeklyClaimed: string[];
}

export interface TournamentEntryState {
  tournamentId: string;
  points: number;
  claimed: boolean;
  endsAt: number;
}

export interface Profile {
  uid: string;
  displayName: string;
  email: string;
  xp: number;
  coins: number;
  medals: number;
  ownedSkins: string[];
  selectedSkinId: string;
  customSkins: Skin[];
  ownedOutfits: string[];
  equippedOutfit: string | null;
  ownedAbilities: AbilityId[];
  loadout: { survivor: AbilityId[]; zombie: AbilityId[] };
  upgrades: Record<UpgradeId, number>;
  ownedFilters: string[];
  equippedFilter: string;
  stats: PlayerStats;
  missions: MissionProgressState;
  achievements: string[];
  bestObstacleTimes: Record<string, number>;
  obstacleMedals: Record<string, 'gold' | 'silver' | 'bronze'>;
  tournaments: Record<string, TournamentEntryState>;
  createdAt: number;
}

/** Summary of one match from the local player's point of view. */
export interface MatchResult {
  mode: GameMode;
  mapId: string;
  won: boolean;
  winner: Role | 'finish' | 'none';
  finalRole: Role;
  startRole: Role;
  tasks: number;
  tasksByType: Partial<Record<TaskType, number>>;
  infections: number;
  /** Frozen teammates healed as a doctor. */
  cures?: number;
  secondsSurvived: number;
  abilitiesUsed: number;
  durationSec: number;
  obstacleTimeMs?: number;
  tournamentId?: string;
  /** Knockout tournament: how many players started this round. */
  roundSize?: number;
  /** Knockout tournament: how many players move on (the winning starting team). */
  advancing?: number;
}
