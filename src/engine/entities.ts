import type { AbilityId, BotDifficulty, Role, Skin, TaskType, UpgradeId } from '../types.ts';
import type { Vec } from './map.ts';

export type EffectKey = 'sprint' | 'shield' | 'scan' | 'invisible' | 'dash' | 'vision' | 'slowed' | 'frenzy' | 'blinded';
export const EFFECT_KEYS: EffectKey[] = ['sprint', 'shield', 'scan', 'invisible', 'dash', 'vision', 'slowed', 'frenzy', 'blinded'];

/** Buffs one player can put on another (sent over the network when the target is remote). */
export type BuffKind = 'shield' | 'cure' | 'slow' | 'blind';

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
  /** Extra speed only while playing as a zombie. */
  zombieSpeed: number;
  /** Extra sight range only while playing as a zombie. */
  zombieVision: number;
  /** Multiplier on how far a zombie hears survivors' footsteps. */
  hearing: number;
  /** A zombie sees survivors this close even through walls (px). */
  wallSight: number;
}

export interface Noise {
  x: number;
  y: number;
  at: number;
  until: number;
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
  /** Noise this zombie already reacted to, and how long it ignores far survivors for it. */
  heardNoise?: string;
  distractedUntil?: number;
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
  /** Frozen teammates this player healed as a doctor. */
  cures: number;
  /** Doctor who last healed this player, sent so the doctor's own client can credit the heal. */
  curedBy: string | null;
  /** Each survivor gets one stone per match to make a noise somewhere else. */
  stoneUsed: boolean;
  noise: Noise | null;
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
  /** Equipped zombie screen filter; each one carries a small zombie perk. */
  filter?: string | null;
}

export function emptyEffects(): Record<EffectKey, number> {
  return { sprint: 0, shield: 0, scan: 0, invisible: 0, dash: 0, vision: 0, slowed: 0, frenzy: 0, blinded: 0 };
}

export function isActive(p: EnginePlayer, key: EffectKey, now: number): boolean {
  return p.effects[key] > now;
}
