import type { AbilityId, Role, Skin, UpgradeId } from '../types.ts';
import { UPGRADES } from '../data/catalog.ts';
import type { EffectKey, EnginePlayer, Modifiers } from './entities.ts';
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
  sprint: { id: 'sprint', role: 'survivor', name: 'מהירות', icon: '💨', description: 'ריצה מהירה פי 1.6 למשך 3 שניות', cooldownSec: 15, durationSec: 3 },
  scan: { id: 'scan', role: 'survivor', name: 'חיפוש', icon: '📡', description: 'חושף את כל הזומבים במפה ל-5 שניות', cooldownSec: 20, durationSec: 5 },
  medic: { id: 'medic', role: 'survivor', name: 'רופא', icon: '💊', description: 'מגן עליך ועל שורדים קרובים ל-4 שניות', cooldownSec: 25, durationSec: 4, radius: 170 },
  invisibility: { id: 'invisibility', role: 'survivor', name: 'היעלמות', icon: '🫥', description: 'זומבים לא רואים אותך ל-4 שניות (חוץ ממגע קרוב)', cooldownSec: 30, durationSec: 4 },
  dash: { id: 'dash', role: 'zombie', name: 'זינוק', icon: '⚡', description: 'האצה פי 2.1 ל-1.2 שניות', cooldownSec: 10, durationSec: 1.2 },
  zombieVision: { id: 'zombieVision', role: 'zombie', name: 'ראיית זומבי', icon: '👁️', description: 'רואה את כל השורדים דרך קירות ל-5 שניות', cooldownSec: 22, durationSec: 5 },
  roar: { id: 'roar', role: 'zombie', name: 'שאגה', icon: '📢', description: 'מאט שורדים קרובים ב-50% ל-2.5 שניות', cooldownSec: 28, durationSec: 2.5, radius: 180 },
};

export const FREE_ABILITIES: AbilityId[] = ['sprint', 'scan', 'medic', 'dash', 'zombieVision'];
export const DEFAULT_LOADOUT = { survivor: ['sprint', 'scan', 'medic'] as AbilityId[], zombie: ['dash', 'zombieVision'] as AbilityId[] };
export const MAX_LOADOUT = 3;

const EFFECT_FOR: Partial<Record<AbilityId, EffectKey>> = {
  sprint: 'sprint',
  scan: 'scan',
  invisibility: 'invisible',
  dash: 'dash',
  zombieVision: 'vision',
};

export function buildModifiers(skin: Skin, upgrades: Partial<Record<UpgradeId, number>> = {}): Modifiers {
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
    detectability: 1,
    tankShield: false,
  };
  switch (skin.power) {
    case 'swift': m.speed *= 1.08; break;
    case 'healer': m.medicCooldown = 0.7; break;
    case 'tank': m.tankShield = true; break;
    case 'ghost': m.detectability = 0.7; break;
    case 'alpha': m.dashCooldown = 0.7; break;
    case 'hunter': m.reach *= 1.15; break;
    case 'scout': m.vision *= 1.15; break;
  }
  return m;
}

/** Minimal view of the engine the ability manager needs (avoids a circular import). */
export interface AbilityWorld {
  players: EnginePlayer[];
  cooldownScale: number;
  canSee(viewer: EnginePlayer, target: EnginePlayer, now: number): boolean;
  isFrozen(p: EnginePlayer, now?: number): boolean;
  applyEffect(target: EnginePlayer, kind: 'shield' | 'cure' | 'slow', durationMs: number, from: EnginePlayer): void;
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
        if (ready.includes('invisibility')) return 'invisibility';
        if (ready.includes('sprint')) return 'sprint';
        if (ready.includes('medic')) return 'medic';
      }
      if (nearest.d < 170 && ready.includes('sprint')) return 'sprint';
      if (!enemies.length && ready.includes('scan')) return 'scan';
      return null;
    }
    // Zombie
    if (isActive(p, 'dash', now)) return null;
    const close = world.players.filter((o) => o.role === 'survivor' && Math.hypot(o.x - p.x, o.y - p.y) < 170);
    if (close.length && ready.includes('roar')) return 'roar';
    if (nearest.o && nearest.d < 190 && ready.includes('dash')) return 'dash';
    if (!enemies.length && ready.includes('zombieVision')) return 'zombieVision';
    return null;
  },
};
