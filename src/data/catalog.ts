// Shop catalog: outfits, filters, upgrades, abilities for sale, coin packs.
import type { AbilityId, UpgradeId } from '../types.ts';

export interface Outfit {
  id: string;
  name: string;
  emoji: string;
  price: number;
  minLevel: number;
}

export const OUTFITS: Outfit[] = [
  { id: 'cap', name: 'Cap', emoji: '🧢', price: 120, minLevel: 1 },
  { id: 'tophat', name: 'Top Hat', emoji: '🎩', price: 300, minLevel: 3 },
  { id: 'headphones', name: 'Headphones', emoji: '🎧', price: 250, minLevel: 2 },
  { id: 'shades', name: 'Sunglasses', emoji: '🕶️', price: 200, minLevel: 2 },
  { id: 'helmet', name: 'Helmet', emoji: '⛑️', price: 450, minLevel: 5 },
  { id: 'crown', name: 'Crown', emoji: '👑', price: 1500, minLevel: 10 },
  { id: 'flame', name: 'Flame', emoji: '🔥', price: 800, minLevel: 7 },
  { id: 'skull', name: 'Skull', emoji: '💀', price: 600, minLevel: 6 },
  { id: 'bow', name: 'Bow Tie', emoji: '🎀', price: 180, minLevel: 1 },
  { id: 'gradcap', name: 'Grad Cap', emoji: '🎓', price: 350, minLevel: 3 },
  { id: 'star', name: 'Star', emoji: '🌟', price: 700, minLevel: 6 },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', price: 1200, minLevel: 9 },
  { id: 'sunhat', name: 'Straw Hat', emoji: '👒', price: 220, minLevel: 2 },
  { id: 'clover', name: 'Lucky Clover', emoji: '🍀', price: 260, minLevel: 2 },
  { id: 'bone', name: 'Bone', emoji: '🦴', price: 300, minLevel: 3 },
  { id: 'army', name: 'Army Helmet', emoji: '🪖', price: 400, minLevel: 4 },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', price: 550, minLevel: 5 },
  { id: 'brain', name: 'Brain', emoji: '🧠', price: 900, minLevel: 7 },
  { id: 'alien', name: 'Alien', emoji: '👽', price: 1000, minLevel: 8 },
  { id: 'diamond', name: 'Diamond', emoji: '💎', price: 2500, minLevel: 12 },
];

/** The emoji drawn on the character for an outfit id (null for none). */
export function outfitEmoji(id: string | null | undefined): string | null {
  return OUTFITS.find((o) => o.id === id)?.emoji ?? null;
}

export interface ZombieFilter {
  id: string;
  name: string;
  description: string;
  color: string;
  opacity: number;
  price: number;
  vignette: string;
  /** What the filter does for you while you are a zombie (shown in the shop). */
  perk: string;
  bonus: FilterBonus;
}

/** Zombie-only perks a filter gives; multipliers default to 1, wallSight to 0. */
export interface FilterBonus {
  zombieVision?: number;
  zombieSpeed?: number;
  hearing?: number;
  reach?: number;
  dashCooldown?: number;
  wallSight?: number;
}

/** Screen overlays applied while the local player is a zombie. */
export const ZOMBIE_FILTERS: ZombieFilter[] = [
  { id: 'classic', name: 'Classic', description: 'A soft green tint', color: '#2f6b1f', opacity: 0.12, price: 0, vignette: '#0a1a05', perk: 'No bonus', bonus: {} },
  { id: 'nightvision', name: 'Night Vision', description: 'Glowing green like night-vision goggles', color: '#39ff14', opacity: 0.18, price: 400, vignette: '#001a00', perk: 'See 15% farther', bonus: { zombieVision: 1.15 } },
  { id: 'bloodmoon', name: 'Blood Moon', description: 'Everything turns red', color: '#b00020', opacity: 0.2, price: 600, vignette: '#1a0000', perk: '+5% speed', bonus: { zombieSpeed: 1.05 } },
  { id: 'thermal', name: 'Thermal', description: 'Purple-orange heat colors', color: '#ff6a00', opacity: 0.16, price: 750, vignette: '#1a0033', perk: 'Hear footsteps 40% farther', bonus: { hearing: 1.4 } },
  { id: 'toxic', name: 'Toxic', description: 'A toxic purple haze', color: '#9d00ff', opacity: 0.17, price: 900, vignette: '#12001f', perk: '+15% infection range', bonus: { reach: 1.15 } },
  { id: 'frost', name: 'Frost', description: 'A frozen blue screen', color: '#7fdbff', opacity: 0.16, price: 1100, vignette: '#001a2a', perk: 'Dash recharges 20% faster', bonus: { dashCooldown: 0.8 } },
  { id: 'xray', name: 'X-Ray', description: 'Everything looks like an X-ray', color: '#d8e4ff', opacity: 0.14, price: 1400, vignette: '#0a0f1f', perk: 'See survivors through walls at short range', bonus: { wallSight: 110 } },
  { id: 'predator', name: 'Predator', description: 'Bright hunter gold', color: '#ffd000', opacity: 0.15, price: 2000, vignette: '#1f1400', perk: '+10% vision and +25% hearing', bonus: { zombieVision: 1.1, hearing: 1.25 } },
];

export function filterBonus(id: string | null | undefined): FilterBonus {
  return ZOMBIE_FILTERS.find((f) => f.id === id)?.bonus ?? {};
}

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  perLevel: number; // fraction per level
  maxLevel: number;
  basePrice: number;
  icon: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'speed', name: 'Running Shoes', description: '+4% speed per level', perLevel: 0.04, maxLevel: 5, basePrice: 200, icon: '👟' },
  { id: 'cooldown', name: 'Fast Charger', description: '-6% ability cooldown per level', perLevel: 0.06, maxLevel: 5, basePrice: 250, icon: '⚡' },
  { id: 'vision', name: 'Strong Flashlight', description: '+8% vision range per level', perLevel: 0.08, maxLevel: 5, basePrice: 220, icon: '🔦' },
  { id: 'taskSpeed', name: 'Toolbox', description: '+10% task speed per level', perLevel: 0.1, maxLevel: 5, basePrice: 180, icon: '🧰' },
  { id: 'reach', name: 'Long Arms', description: '+4% infection range (zombie) per level', perLevel: 0.04, maxLevel: 5, basePrice: 240, icon: '🧟' },
  { id: 'stealth', name: 'Quiet Steps', description: 'Zombies spot and hear you from 5% less distance per level (survivor)', perLevel: 0.05, maxLevel: 5, basePrice: 230, icon: '🤫' },
];

export function upgradePrice(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.basePrice * Math.pow(1.6, currentLevel));
}

/** Player level required to buy the next upgrade level. */
export function upgradeMinLevel(currentLevel: number): number {
  return currentLevel * 2 + 1;
}

export const ABILITY_PRICES: Partial<Record<AbilityId, { price: number; minLevel: number }>> = {
  invisibility: { price: 1000, minLevel: 4 },
  roar: { price: 1000, minLevel: 4 },
  smoke: { price: 1200, minLevel: 6 },
  frenzy: { price: 1200, minLevel: 6 },
  teleport: { price: 1500, minLevel: 8 },
  leap: { price: 1500, minLevel: 8 },
};

export const MEDAL_TO_COINS = 50;
