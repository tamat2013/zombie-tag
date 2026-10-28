import type { AbilityId, BotDifficulty, Role, Skin, TaskType, UpgradeId } from '../types.ts';
import type { Vec } from './map.ts';

export type EffectKey = 'sprint' | 'shield' | 'scan' | 'invisible' | 'dash' | 'vision' | 'slowed';
export const EFFECT_KEYS: EffectKey[] = ['sprint', 'shield', 'scan', 'invisible', 'dash', 'vision', 'slowed'];

/** Who drives a player in this client: local input, the network, or this client's AI. */
export type Control = 'local' | 'remote' | 'ai';

export interface Modifiers {
  speed: number;
  cooldown: number;
  vision: number;
  task: number;
  reach: number;
  medicCooldown: number;
  dashCooldown: number;
  /** Multiplier on the distance at which zombies notice this player. */
  detectability: number;
  tankShield: boolean;
}

export interface BotBrain {
  mode: 'task' | 'work' | 'flee' | 'chase' | 'hunt' | 'wander' | 'idle';
  path: Vec[];
  goal?: Vec;
  repathAt: number;
  nextThinkAt: number;
  targetId?: string;
  lastSeen?: { x: number; y: number; at: number };
  stationIndex?: number;
  workUntil?: number;
  stuck: { x: number; y: number; at: number };
}

export interface EnginePlayer {
  id: string;
  name: string;
  isBot: boolean;
  control: Control;
  role: Role;
  startRole: Role;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  skin: Skin;
  outfit: string | null;
  loadout: { survivor: AbilityId[]; zombie: AbilityId[] };
  cooldowns: Partial<Record<AbilityId, number>>;
  effects: Record<EffectKey, number>;
  mods: Modifiers;
  tankShieldAvailable: boolean;
  completedStations: number[];
  tasksByType: Partial<Record<TaskType, number>>;
  infections: number;
  infectedAt: number | null;
  infectedBy: string | null;
  /** Can heal frozen zombies. Lost for good once this player is healed back by another doctor. */
  doctor: boolean;
  inTask: boolean;
  abilitiesUsed: number;
  lastNetUpdate: number;
  netTarget?: { x: number; y: number };
  // Obstacle course
  checkpoint: Vec;
  finishedAt: number | null;
  deaths: number;
  respawnUntil: number;
  // AI
  difficulty: BotDifficulty;
  brain?: BotBrain;
}

export interface RosterEntry {
  id: string;
  name: string;
  isBot: boolean;
  role: Role;
  skin: Skin;
  outfit?: string | null;
  loadout?: { survivor: AbilityId[]; zombie: AbilityId[] };
  upgrades?: Partial<Record<UpgradeId, number>>;
}

export function emptyEffects(): Record<EffectKey, number> {
  return { sprint: 0, shield: 0, scan: 0, invisible: 0, dash: 0, vision: 0, slowed: 0 };
}

export function isActive(p: EnginePlayer, key: EffectKey, now: number): boolean {
  return p.effects[key] > now;
}
