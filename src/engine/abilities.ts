import type { AbilityId, Role, Skin, UpgradeId } from '../types.ts';
import { UPGRADES, filterBonus } from '../data/catalog.ts';
import type { BuffKind, EffectKey, EnginePlayer, Modifiers } from './entities.ts';
import { isActive } from './entities.ts';

export interface AbilityDef {
  id: AbilityId;
  role: Role;
  name: string;
  icon: string;
  description: string;
  cooldownSec: number;
  durationSec: number;
  radius?: number;
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  sprint: { id: 'sprint', role: 'survivor', name: 'Sprint', icon: '💨', description: 'Run 1.6x faster for 3 seconds', cooldownSec: 15, durationSec: 3 },
  scan: { id: 'scan', role: 'survivor', name: 'Scan', icon: '📡', description: 'Reveals every zombie on the map for 5 seconds', cooldownSec: 20, durationSec: 5 },
  medic: { id: 'medic', role: 'survivor', name: 'Medic', icon: '💊', description: 'Shields you and nearby survivors for 4 seconds', cooldownSec: 25, durationSec: 4, radius: 170 },
  invisibility: { id: 'invisibility', role: 'survivor', name: 'Vanish', icon: '🫥', description: 'Zombies cannot see you for 4 seconds (except up close)', cooldownSec: 30, durationSec: 4 },
  dash: { id: 'dash', role: 'zombie', name: 'Dash', icon: '⚡', description: '1.7x speed burst for 1 second', cooldownSec: 12, durationSec: 1 },
  zombieVision: { id: 'zombieVision', role: 'zombie', name: 'Zombie Vision', icon: '👁️', description: 'See all survivors through walls for 5 seconds', cooldownSec: 22, durationSec: 5 },
  roar: { id: 'roar', role: 'zombie', name: 'Roar', icon: '📢', description: 'Slows nearby survivors by 50% for 2.5 seconds', cooldownSec: 28, durationSec: 2.5, radius: 180 },
  smoke: { id: 'smoke', role: 'survivor', name: 'Smoke Bomb', icon: '🌫️', description: 'Blinds nearby zombies: they can barely see for 4 seconds', cooldownSec: 28, durationSec: 4, radius: 200 },
  teleport: { id: 'teleport', role: 'survivor', name: 'Teleport', icon: '🌀', description: 'Takes you to the spawn point farthest from the zombies', cooldownSec: 40, durationSec: 0 },
  frenzy: { id: 'frenzy', role: 'zombie', name: 'Frenzy', icon: '🩸', description: '1.35x speed for 5 seconds', cooldownSec: 24, durationSec: 5 },
  leap: { id: 'leap', role: 'zombie', name: 'Leap', icon: '🦘', description: 'Jumps 3 tiles forward instantly', cooldownSec: 14, durationSec: 0 },
};

/** How far a zombie's leap goes, in pixels. */
export const LEAP_DISTANCE = 48 * 3;

export const FREE_ABILITIES: AbilityId[] = ['sprint', 'scan', 'medic', 'dash', 'zombieVision'];
export const DEFAULT_LOADOUT = { survivor: ['sprint', 'scan', 'medic'] as AbilityId[], zombie: ['dash', 'zombieVision'] as AbilityId[] };
export const MAX_LOADOUT = 3;

const EFFECT_FOR: Partial<Record<AbilityId, EffectKey>> = {
  sprint: 'sprint',
  scan: 'scan',
  invisibility: 'invisible',
  dash: 'dash',
  zombieVision: 'vision',
  frenzy: 'frenzy',
};

export function buildModifiers(skin: Skin, upgrades: Partial<Record<UpgradeId, number>> = {}, filter?: string | null): Modifiers {
  const lvl = (id: UpgradeId) => Math.max(0, upgrades[id] ?? 0);
  const per = (id: UpgradeId) => UPGRADES.find((u) => u.id === id)!.perLevel;
  const m: Modifiers = {
    speed: 1 + lvl('speed') * per('speed'),
    cooldown: 1 - lvl('cooldown') * per('cooldown'),
    vision: 1 + lvl('vision') * per('vision'),
    task: 1 + lvl('taskSpeed') * per('taskSpeed'),
    reach: 1 + lvl('reach') * per('reach'),
    medicCooldown: 1,
    dashCooldown: 1,
    detectability: 1 - lvl('stealth') * per('stealth'),
    tankShield: false,
    zombieSpeed: 1,
    zombieVision: 1,
    hearing: 1,
    wallSight: 0,
  };
  // Filter perks only touch zombie-side stats, so they never help a survivor.
  const f = filterBonus(filter);
  m.zombieVision *= f.zombieVision ?? 1;
  m.zombieSpeed *= f.zombieSpeed ?? 1;
  m.hearing *= f.hearing ?? 1;
  m.reach *= f.reach ?? 1;
  m.dashCooldown *= f.dashCooldown ?? 1;
  m.wallSight = f.wallSight ?? 0;
  switch (skin.power) {
    case 'swift': m.speed *= 1.08; break;
    case 'healer': m.medicCooldown = 0.7; break;
    case 'tank': m.tankShield = true; break;
    case 'ghost': m.detectability *= 0.7; break;
    case 'alpha': m.dashCooldown = 0.7; break;
    case 'hunter': m.reach *= 1.15; break;
    case 'scout': m.vision *= 1.15; break;
    case 'engineer': m.task *= 1.25; break;
    case 'master': m.cooldown *= 0.85; break;
    case 'brute': m.zombieSpeed = 1.08; break;
  }
  return m;
}

/** Minimal view of the engine the ability manager needs (avoids a circular import). */
export interface AbilityWorld {
  players: EnginePlayer[];
  cooldownScale: number;
  canSee(viewer: EnginePlayer, target: EnginePlayer, now: number): boolean;
  isFrozen(p: EnginePlayer, now?: number): boolean;
  applyEffect(target: EnginePlayer, kind: BuffKind, durationMs: number, from: EnginePlayer): void;
  /** Moves a player forward along their facing, stopping at walls. */
  leap(p: EnginePlayer, distance: number): void;
  /** Moves a survivor to the spawn point farthest from every zombie. */
  teleportToSafety(p: EnginePlayer): void;
}

/**
 * Smart ability manager: owns cooldown rules, applies ability effects, and recommends
 * the best ability to use right now (bots act on it; humans see it highlighted).
 */
export const AbilityManager = {
  available(p: EnginePlayer): AbilityId[] {
    return p.role === 'survivor' ? p.loadout.survivor : p.loadout.zombie;
  },

  cooldownMs(p: EnginePlayer, id: AbilityId, world: AbilityWorld): number {
    let mul = p.mods.cooldown * world.cooldownScale;
    if (id === 'medic') mul *= p.mods.medicCooldown;
    if (id === 'dash') mul *= p.mods.dashCooldown;
    return ABILITIES[id].cooldownSec * 1000 * mul;
  },

  remainingMs(p: EnginePlayer, id: AbilityId, now: number): number {
    return Math.max(0, (p.cooldowns[id] ?? 0) - now);
  },

  canUse(p: EnginePlayer, id: AbilityId, now: number): boolean {
    const def = ABILITIES[id];
    if (!def || def.role !== p.role) return false;
    if (!this.available(p).includes(id)) return false;
    if (p.inTask || p.respawnUntil > now) return false;
    return this.remainingMs(p, id, now) <= 0;
  },

  activate(world: AbilityWorld, p: EnginePlayer, id: AbilityId, now: number): boolean {
    if (!this.canUse(p, id, now)) return false;
    const def = ABILITIES[id];
    const dur = def.durationSec * 1000;
    p.cooldowns[id] = now + this.cooldownMs(p, id, world);
    p.abilitiesUsed++;
    const effect = EFFECT_FOR[id];
    if (effect) p.effects[effect] = now + dur;
    if (id === 'medic') {
      p.effects.shield = Math.max(p.effects.shield, now + dur);
      for (const other of world.players) {
        if (other === p || Math.hypot(other.x - p.x, other.y - p.y) > def.radius!) continue;
        if (other.role === 'survivor') world.applyEffect(other, 'shield', dur, p);
      }
    }
    if (id === 'roar') {
      for (const other of world.players) {
        if (other.role !== 'survivor' || Math.hypot(other.x - p.x, other.y - p.y) > def.radius!) continue;
        world.applyEffect(other, 'slow', dur, p);
      }
    }
    if (id === 'smoke') {
      for (const other of world.players) {
        if (other.role !== 'zombie' || Math.hypot(other.x - p.x, other.y - p.y) > def.radius!) continue;
        world.applyEffect(other, 'blind', dur, p);
      }
    }
    if (id === 'teleport') world.teleportToSafety(p);
    if (id === 'leap') world.leap(p, LEAP_DISTANCE);
    return true;
  },

  /** Heuristic recommendation for the current moment, or null when nothing is worth using. */
  suggest(world: AbilityWorld, p: EnginePlayer, now: number): AbilityId | null {
    const ready = this.available(p).filter((id) => this.canUse(p, id, now));
    if (!ready.length) return null;
    const enemies = world.players.filter((o) => o.role !== p.role && !world.isFrozen(o, now) && world.canSee(p, o, now));
    const nearest = enemies.reduce<{ d: number; o: EnginePlayer | null }>(
      (best, o) => {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        return d < best.d ? { d, o } : best;
      },
      { d: Infinity, o: null },
    );
    if (p.role === 'survivor') {
      if (isActive(p, 'shield', now) || isActive(p, 'sprint', now) || isActive(p, 'invisible', now)) return null;
      const allies = world.players.filter((o) => o !== p && o.role === 'survivor' && Math.hypot(o.x - p.x, o.y - p.y) < 170);
      if (nearest.d < 110) {
        if (ready.includes('medic') && allies.length > 0) return 'medic';
        if (ready.includes('smoke')) return 'smoke';
        if (ready.includes('invisibility')) return 'invisibility';
        if (ready.includes('sprint')) return 'sprint';
        if (ready.includes('teleport')) return 'teleport';
        if (ready.includes('medic')) return 'medic';
      }
      if (nearest.d < 170 && ready.includes('sprint')) return 'sprint';
      if (!enemies.length && ready.includes('scan')) return 'scan';
      return null;
    }
    // Zombie
    if (isActive(p, 'dash', now) || isActive(p, 'frenzy', now)) return null;
    const close = world.players.filter((o) => o.role === 'survivor' && Math.hypot(o.x - p.x, o.y - p.y) < 170);
    if (close.length && ready.includes('roar')) return 'roar';
    if (nearest.o && nearest.d < 190 && ready.includes('dash')) return 'dash';
    if (nearest.o && nearest.d > 90 && nearest.d < 170 && ready.includes('leap')) {
      const ahead = Math.cos(Math.atan2(nearest.o.y - p.y, nearest.o.x - p.x) - p.facing);
      if (ahead > 0.9) return 'leap';
    }
    if (nearest.o && nearest.d < 320 && ready.includes('frenzy')) return 'frenzy';
    if (!enemies.length && ready.includes('zombieVision')) return 'zombieVision';
    return null;
  },
};
