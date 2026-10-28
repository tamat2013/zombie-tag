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
  { id: 'cap', name: 'כובע מצחייה', emoji: '🧢', price: 120, minLevel: 1 },
  { id: 'tophat', name: 'מגבעת', emoji: '🎩', price: 300, minLevel: 3 },
  { id: 'headphones', name: 'אוזניות', emoji: '🎧', price: 250, minLevel: 2 },
  { id: 'shades', name: 'משקפי שמש', emoji: '🕶️', price: 200, minLevel: 2 },
  { id: 'helmet', name: 'קסדה', emoji: '⛑️', price: 450, minLevel: 5 },
  { id: 'crown', name: 'כתר', emoji: '👑', price: 1500, minLevel: 10 },
  { id: 'flame', name: 'להבה', emoji: '🔥', price: 800, minLevel: 7 },
  { id: 'skull', name: 'גולגולת', emoji: '💀', price: 600, minLevel: 6 },
  { id: 'bow', name: 'פפיון', emoji: '🎀', price: 180, minLevel: 1 },
  { id: 'gradcap', name: 'כובע סיום', emoji: '🎓', price: 350, minLevel: 3 },
  { id: 'star', name: 'כוכב', emoji: '🌟', price: 700, minLevel: 6 },
  { id: 'unicorn', name: 'חד-קרן', emoji: '🦄', price: 1200, minLevel: 9 },
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
}

/** Screen overlays applied while the local player is a zombie. */
export const ZOMBIE_FILTERS: ZombieFilter[] = [
  { id: 'classic', name: 'קלאסי', description: 'גוון ירוק עדין', color: '#2f6b1f', opacity: 0.12, price: 0, vignette: '#0a1a05' },
  { id: 'nightvision', name: 'ראיית לילה', description: 'ירוק זוהר כמו משקפת לילה', color: '#39ff14', opacity: 0.18, price: 400, vignette: '#001a00' },
  { id: 'bloodmoon', name: 'ירח דם', description: 'הכל נצבע באדום', color: '#b00020', opacity: 0.2, price: 600, vignette: '#1a0000' },
  { id: 'thermal', name: 'תרמי', description: 'צבעי חום סגולים-כתומים', color: '#ff6a00', opacity: 0.16, price: 750, vignette: '#1a0033' },
  { id: 'toxic', name: 'רעיל', description: 'ערפל סגול רעיל', color: '#9d00ff', opacity: 0.17, price: 900, vignette: '#12001f' },
];

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
  { id: 'speed', name: 'נעלי ריצה', description: '+4% מהירות לכל רמה', perLevel: 0.04, maxLevel: 5, basePrice: 200, icon: '👟' },
  { id: 'cooldown', name: 'מטען מהיר', description: '-6% זמן טעינת יכולות לכל רמה', perLevel: 0.06, maxLevel: 5, basePrice: 250, icon: '⚡' },
  { id: 'vision', name: 'פנס חזק', description: '+8% טווח ראייה לכל רמה', perLevel: 0.08, maxLevel: 5, basePrice: 220, icon: '🔦' },
  { id: 'taskSpeed', name: 'ארגז כלים', description: '+10% מהירות משימות לכל רמה', perLevel: 0.1, maxLevel: 5, basePrice: 180, icon: '🧰' },
  { id: 'reach', name: 'זרועות ארוכות', description: '+4% טווח הדבקה (זומבי) לכל רמה', perLevel: 0.04, maxLevel: 5, basePrice: 240, icon: '🧟' },
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
