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
  { id: 'sunhat', name: 'כובע קש', emoji: '👒', price: 220, minLevel: 2 },
  { id: 'clover', name: 'תלתן מזל', emoji: '🍀', price: 260, minLevel: 2 },
  { id: 'bone', name: 'עצם', emoji: '🦴', price: 300, minLevel: 3 },
  { id: 'army', name: 'קסדה צבאית', emoji: '🪖', price: 400, minLevel: 4 },
  { id: 'pumpkin', name: 'דלעת', emoji: '🎃', price: 550, minLevel: 5 },
  { id: 'brain', name: 'מוח', emoji: '🧠', price: 900, minLevel: 7 },
  { id: 'alien', name: 'חייזר', emoji: '👽', price: 1000, minLevel: 8 },
  { id: 'diamond', name: 'יהלום', emoji: '💎', price: 2500, minLevel: 12 },
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
  { id: 'classic', name: 'קלאסי', description: 'גוון ירוק עדין', color: '#2f6b1f', opacity: 0.12, price: 0, vignette: '#0a1a05', perk: 'בלי בונוס', bonus: {} },
  { id: 'nightvision', name: 'ראיית לילה', description: 'ירוק זוהר כמו משקפת לילה', color: '#39ff14', opacity: 0.18, price: 400, vignette: '#001a00', perk: 'רואה 15% רחוק יותר', bonus: { zombieVision: 1.15 } },
  { id: 'bloodmoon', name: 'ירח דם', description: 'הכל נצבע באדום', color: '#b00020', opacity: 0.2, price: 600, vignette: '#1a0000', perk: '+5% מהירות', bonus: { zombieSpeed: 1.05 } },
  { id: 'thermal', name: 'תרמי', description: 'צבעי חום סגולים-כתומים', color: '#ff6a00', opacity: 0.16, price: 750, vignette: '#1a0033', perk: 'שומע צעדים 40% רחוק יותר', bonus: { hearing: 1.4 } },
  { id: 'toxic', name: 'רעיל', description: 'ערפל סגול רעיל', color: '#9d00ff', opacity: 0.17, price: 900, vignette: '#12001f', perk: '+15% טווח הדבקה', bonus: { reach: 1.15 } },
  { id: 'frost', name: 'קרח', description: 'מסך כחול קפוא', color: '#7fdbff', opacity: 0.16, price: 1100, vignette: '#001a2a', perk: 'הזינוק נטען 20% מהר יותר', bonus: { dashCooldown: 0.8 } },
  { id: 'xray', name: 'רנטגן', description: 'הכל נראה כמו צילום רנטגן', color: '#d8e4ff', opacity: 0.14, price: 1400, vignette: '#0a0f1f', perk: 'רואה שורדים דרך קירות מטווח קצר', bonus: { wallSight: 110 } },
  { id: 'predator', name: 'טורף', description: 'זהב בוהק של צייד', color: '#ffd000', opacity: 0.15, price: 2000, vignette: '#1f1400', perk: 'ראייה +10% ושמיעה +25%', bonus: { zombieVision: 1.1, hearing: 1.25 } },
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
  { id: 'speed', name: 'נעלי ריצה', description: '+4% מהירות לכל רמה', perLevel: 0.04, maxLevel: 5, basePrice: 200, icon: '👟' },
  { id: 'cooldown', name: 'מטען מהיר', description: '-6% זמן טעינת יכולות לכל רמה', perLevel: 0.06, maxLevel: 5, basePrice: 250, icon: '⚡' },
  { id: 'vision', name: 'פנס חזק', description: '+8% טווח ראייה לכל רמה', perLevel: 0.08, maxLevel: 5, basePrice: 220, icon: '🔦' },
  { id: 'taskSpeed', name: 'ארגז כלים', description: '+10% מהירות משימות לכל רמה', perLevel: 0.1, maxLevel: 5, basePrice: 180, icon: '🧰' },
  { id: 'reach', name: 'זרועות ארוכות', description: '+4% טווח הדבקה (זומבי) לכל רמה', perLevel: 0.04, maxLevel: 5, basePrice: 240, icon: '🧟' },
  { id: 'stealth', name: 'צעדים שקטים', description: 'זומבים מבחינים בך ושומעים אותך 5% פחות רחוק לכל רמה (שורד)', perLevel: 0.05, maxLevel: 5, basePrice: 230, icon: '🤫' },
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
