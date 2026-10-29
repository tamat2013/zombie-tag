// Shop catalog: outfits, filters, upgrades, abilities for sale, coin packs.
import type { AbilityId, UpgradeId } from '../types.ts';

export interface Outfit {
  id: string;
  name: string;
  emoji: string;
  price: number;
  minLevel: number;
  /** When set, the item is sold for medals only (price is ignored). */
  medalPrice?: number;
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
  { id: 'cowboy', name: 'Cowboy Hat', emoji: '🤠', price: 280, minLevel: 2 },
  { id: 'scarf', name: 'Scarf', emoji: '🧣', price: 150, minLevel: 1 },
  { id: 'goggles', name: 'Lab Goggles', emoji: '🥽', price: 320, minLevel: 3 },
  { id: 'mask', name: 'Face Mask', emoji: '😷', price: 140, minLevel: 1 },
  { id: 'snorkel', name: 'Snorkel', emoji: '🤿', price: 380, minLevel: 4 },
  { id: 'wand', name: 'Magic Wand', emoji: '🪄', price: 650, minLevel: 6 },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', price: 500, minLevel: 5 },
  { id: 'axe', name: 'Fire Axe', emoji: '🪓', price: 720, minLevel: 6 },
  { id: 'flashlight', name: 'Flashlight', emoji: '🔦', price: 240, minLevel: 2 },
  { id: 'magnet', name: 'Magnet', emoji: '🧲', price: 330, minLevel: 3 },
  { id: 'pizza', name: 'Pizza Slice', emoji: '🍕', price: 160, minLevel: 1 },
  { id: 'donut', name: 'Donut', emoji: '🍩', price: 170, minLevel: 1 },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', price: 210, minLevel: 2 },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', price: 420, minLevel: 4 },
  { id: 'frog', name: 'Frog Friend', emoji: '🐸', price: 460, minLevel: 4 },
  { id: 'octopus', name: 'Octopus', emoji: '🐙', price: 780, minLevel: 7 },
  { id: 'bat', name: 'Bat', emoji: '🦇', price: 520, minLevel: 5 },
  { id: 'spider', name: 'Spider', emoji: '🕷️', price: 480, minLevel: 5 },
  { id: 'planet', name: 'Ringed Planet', emoji: '🪐', price: 1100, minLevel: 9 },
  { id: 'bolt', name: 'Lightning', emoji: '⚡', price: 600, minLevel: 6 },
  { id: 'moon', name: 'Crescent Moon', emoji: '🌙', price: 400, minLevel: 4 },
  { id: 'radioactive', name: 'Radioactive', emoji: '☢️', price: 1300, minLevel: 10 },
  { id: 'potion', name: 'Potion', emoji: '🧪', price: 680, minLevel: 6 },
  { id: 'target', name: 'Bullseye', emoji: '🎯', price: 300, minLevel: 3 },
  { id: 'ufo', name: 'UFO', emoji: '🛸', price: 1400, minLevel: 11 },
  { id: 'trex', name: 'T-Rex', emoji: '🦖', price: 1600, minLevel: 11 },
  { id: 'moai', name: 'Stone Head', emoji: '🗿', price: 900, minLevel: 8 },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', price: 1250, minLevel: 10 },
  { id: 'ghosthat', name: 'Little Ghost', emoji: '👻', price: 750, minLevel: 7 },
  { id: 'biohazard', name: 'Biohazard', emoji: '☣️', price: 1800, minLevel: 12 },
  // Medal-only outfits.
  { id: 'trophy', name: 'Trophy', emoji: '🏆', price: 0, minLevel: 1, medalPrice: 8 },
  { id: 'military', name: 'War Medal', emoji: '🎖️', price: 0, minLevel: 1, medalPrice: 10 },
  { id: 'trident', name: 'Trident', emoji: '🔱', price: 0, minLevel: 1, medalPrice: 15 },
  { id: 'wings', name: 'Wings', emoji: '🪽', price: 0, minLevel: 1, medalPrice: 20 },
  { id: 'comet', name: 'Comet', emoji: '☄️', price: 0, minLevel: 1, medalPrice: 30 },
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
  /** When set, the filter is sold for medals only. */
  medalPrice?: number;
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
  { id: 'swamp', name: 'Swamp', description: 'Murky bog green', color: '#4b5d1a', opacity: 0.2, price: 500, vignette: '#0d1203', perk: 'Hear footsteps 20% farther', bonus: { hearing: 1.2 } },
  { id: 'oldfilm', name: 'Old Film', description: 'Faded sepia like an old horror movie', color: '#a0784a', opacity: 0.2, price: 550, vignette: '#1a1006', perk: '+8% infection range', bonus: { reach: 1.08 } },
  { id: 'neon', name: 'Neon', description: 'Hot pink arcade glow', color: '#ff2fa8', opacity: 0.15, price: 850, vignette: '#1f0014', perk: '+3% speed and +8% vision', bonus: { zombieSpeed: 1.03, zombieVision: 1.08 } },
  { id: 'ash', name: 'Ash', description: 'Grey, burnt-out world', color: '#8a8a8a', opacity: 0.2, price: 950, vignette: '#111111', perk: 'Dash recharges 12% faster', bonus: { dashCooldown: 0.88 } },
  { id: 'abyss', name: 'Abyss', description: 'Deep ocean blue', color: '#1238a8', opacity: 0.2, price: 1250, vignette: '#000a24', perk: 'See 20% farther', bonus: { zombieVision: 1.2 } },
  { id: 'radiation', name: 'Radiation', description: 'Sickly yellow-green fallout', color: '#c8ff00', opacity: 0.16, price: 1600, vignette: '#141a00', perk: '+7% speed', bonus: { zombieSpeed: 1.07 } },
  // Medal-only filters.
  { id: 'eclipse', name: 'Eclipse', description: 'A black sun with a burning rim', color: '#ff7a00', opacity: 0.12, price: 0, medalPrice: 18, vignette: '#000000', perk: 'Walls hide nothing up close, +10% hearing', bonus: { wallSight: 90, hearing: 1.1 } },
  { id: 'hivemind', name: 'Hive Mind', description: 'You see what the horde sees', color: '#94d84a', opacity: 0.18, price: 0, medalPrice: 35, vignette: '#0a1400', perk: '+12% vision, +5% speed, +20% hearing', bonus: { zombieVision: 1.12, zombieSpeed: 1.05, hearing: 1.2 } },
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
  { id: 'firstAid', name: 'First Aid Kit', description: '-6% Medic and Bubble cooldown per level (survivor)', perLevel: 0.06, maxLevel: 5, basePrice: 210, icon: '🩹' },
  { id: 'rotLegs', name: 'Rotten Legs', description: '+3% speed per level (zombie)', perLevel: 0.03, maxLevel: 5, basePrice: 260, icon: '🦵' },
  { id: 'deadEyes', name: 'Dead Eyes', description: '+6% vision range per level (zombie)', perLevel: 0.06, maxLevel: 5, basePrice: 230, icon: '👁️' },
  { id: 'keenEars', name: 'Keen Ears', description: 'Hear footsteps 8% farther per level (zombie)', perLevel: 0.08, maxLevel: 5, basePrice: 220, icon: '👂' },
  { id: 'bloodPump', name: 'Blood Pump', description: '-6% Dash, Rage and Lunge cooldown per level (zombie)', perLevel: 0.06, maxLevel: 5, basePrice: 250, icon: '🫀' },
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
  bubble: { price: 800, minLevel: 3 },
  lunge: { price: 900, minLevel: 3 },
  sniff: { price: 800, minLevel: 3 },
  adrenaline: { price: 1100, minLevel: 5 },
  rage: { price: 1100, minLevel: 5 },
  flashbang: { price: 1300, minLevel: 7 },
  howl: { price: 1300, minLevel: 7 },
  cloak: { price: 1800, minLevel: 10 },
};

export const MEDAL_TO_COINS = 50;
