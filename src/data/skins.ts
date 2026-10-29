import type { Skin, SkinPowerId } from '../types.ts';

export const SKIN_POWERS: Record<SkinPowerId, { name: string; description: string }> = {
  swift: { name: 'Swift', description: '+8% movement speed' },
  healer: { name: 'Healer', description: 'Doctor ability cooldown 30% shorter' },
  tank: { name: 'Tank', description: 'Blocks the first infection of the match' },
  ghost: { name: 'Ghost', description: 'Zombies spot you from 30% closer' },
  alpha: { name: 'Alpha', description: 'Zombie dash cooldown 30% shorter' },
  hunter: { name: 'Hunter', description: '+15% infection range' },
  scout: { name: 'Scout', description: '+15% vision range' },
  engineer: { name: 'Engineer', description: 'Tasks 25% faster' },
  master: { name: 'Master', description: 'All abilities recharge 15% faster' },
  brute: { name: 'Brute', description: '+8% speed as a zombie' },
};

export const BUILT_IN_SKINS: Skin[] = [
  { id: 'rookie', name: 'Rookie', body: '#4f8ef7', accent: '#1f3f7a', eyes: 'round', pattern: 'none', accessory: '', price: 0, rarity: 'common' },
  { id: 'camper', name: 'Camper', body: '#f4a259', accent: '#8c4a12', eyes: 'round', pattern: 'stripes', accessory: '', price: 0, rarity: 'common' },
  { id: 'mint', name: 'Mint', body: '#5ed6a4', accent: '#1e6b4d', eyes: 'sleepy', pattern: 'spots', accessory: '', price: 150, rarity: 'common' },
  { id: 'cherry', name: 'Cherry', body: '#e8475f', accent: '#7a1525', eyes: 'round', pattern: 'ring', accessory: '', price: 150, rarity: 'common' },
  { id: 'ninja', name: 'Ninja', body: '#2b2d42', accent: '#ef233c', eyes: 'angry', pattern: 'split', accessory: '🥷', power: 'swift', price: 900, rarity: 'epic' },
  { id: 'doc', name: 'Dr. Bandage', body: '#f1f5f9', accent: '#e11d48', eyes: 'round', pattern: 'ring', accessory: '🩺', power: 'healer', price: 700, rarity: 'rare' },
  { id: 'tank', name: 'Tank', body: '#556b2f', accent: '#2f3b1a', eyes: 'angry', pattern: 'stripes', accessory: '🪖', power: 'tank', price: 1200, rarity: 'epic' },
  { id: 'ghost', name: 'Ghost', body: '#d7e3fc', accent: '#8ea8d8', eyes: 'sleepy', pattern: 'none', accessory: '👻', power: 'ghost', price: 1500, rarity: 'legendary' },
  { id: 'scout', name: 'Ranger', body: '#c9a227', accent: '#6b5208', eyes: 'round', pattern: 'spots', accessory: '🔭', power: 'scout', price: 800, rarity: 'rare' },
  { id: 'alpha', name: 'Alpha Zombie', body: '#7d8c3a', accent: '#3d1a1a', eyes: 'angry', pattern: 'split', accessory: '🦴', power: 'alpha', price: 1400, rarity: 'legendary' },
  { id: 'hunter', name: 'Night Hunter', body: '#5b2a86', accent: '#1d0b2e', eyes: 'cyclops', pattern: 'ring', accessory: '🗡️', power: 'hunter', price: 1100, rarity: 'epic' },
  { id: 'pumpkin', name: 'Pumpkin', body: '#f77f00', accent: '#5a2e00', eyes: 'angry', pattern: 'stripes', accessory: '🎃', price: 250, rarity: 'common' },
  { id: 'ice', name: 'Iceberg', body: '#a8e6ff', accent: '#1d6fa3', eyes: 'sleepy', pattern: 'spots', accessory: '❄️', price: 300, rarity: 'common' },
  { id: 'pirate', name: 'Pirate', body: '#8d5524', accent: '#111827', eyes: 'cyclops', pattern: 'stripes', accessory: '🏴‍☠️', price: 450, rarity: 'rare' },
  { id: 'rainbow', name: 'Rainbow', body: '#ff7eb6', accent: '#6366f1', eyes: 'round', pattern: 'split', accessory: '🌈', price: 500, rarity: 'rare' },
  { id: 'robot', name: 'Robot', body: '#9ca3af', accent: '#00b4d8', eyes: 'cyclops', pattern: 'ring', accessory: '🤖', power: 'engineer', price: 950, rarity: 'epic' },
  { id: 'astronaut', name: 'Astronaut', body: '#e5e7eb', accent: '#1e3a8a', eyes: 'round', pattern: 'ring', accessory: '🚀', power: 'swift', price: 1000, rarity: 'epic' },
  { id: 'lava', name: 'Lava', body: '#ef233c', accent: '#f97316', eyes: 'angry', pattern: 'spots', accessory: '🌋', power: 'brute', price: 1300, rarity: 'epic' },
  { id: 'dragon', name: 'Dragon', body: '#14b8a6', accent: '#064e3b', eyes: 'angry', pattern: 'stripes', accessory: '🐉', power: 'master', price: 2200, rarity: 'legendary' },
  { id: 'banana', name: 'Banana', body: '#ffe14d', accent: '#7a5c00', eyes: 'round', pattern: 'none', accessory: '🍌', price: 180, rarity: 'common' },
  { id: 'grape', name: 'Grape', body: '#7b3fbf', accent: '#2e0f52', eyes: 'sleepy', pattern: 'spots', accessory: '🍇', price: 200, rarity: 'common' },
  { id: 'sky', name: 'Sky', body: '#7cc6fe', accent: '#25507a', eyes: 'round', pattern: 'stripes', accessory: '☁️', price: 220, rarity: 'common' },
  { id: 'coal', name: 'Coal', body: '#3a3a3a', accent: '#ff7b00', eyes: 'angry', pattern: 'spots', accessory: '', price: 260, rarity: 'common' },
  { id: 'peach', name: 'Peach', body: '#ffb38a', accent: '#a34a1c', eyes: 'sleepy', pattern: 'ring', accessory: '🍑', price: 240, rarity: 'common' },
  { id: 'cactus', name: 'Prickly', body: '#4caf50', accent: '#1b5e20', eyes: 'angry', pattern: 'stripes', accessory: '🌵', price: 350, rarity: 'common' },
  { id: 'chef', name: 'Chef', body: '#fafafa', accent: '#d32f2f', eyes: 'round', pattern: 'split', accessory: '👨‍🍳', power: 'engineer', price: 650, rarity: 'rare' },
  { id: 'firefighter', name: 'Firefighter', body: '#d62828', accent: '#fcbf49', eyes: 'round', pattern: 'stripes', accessory: '🧯', power: 'tank', price: 850, rarity: 'rare' },
  { id: 'mechanic', name: 'Mechanic', body: '#3d5a80', accent: '#ee6c4d', eyes: 'sleepy', pattern: 'split', accessory: '🔧', power: 'engineer', price: 750, rarity: 'rare' },
  { id: 'detective', name: 'Detective', body: '#a1795a', accent: '#3b2a1a', eyes: 'cyclops', pattern: 'none', accessory: '🔍', power: 'scout', price: 780, rarity: 'rare' },
  { id: 'runner', name: 'Marathoner', body: '#00c2a8', accent: '#00453b', eyes: 'round', pattern: 'stripes', accessory: '🏃', power: 'swift', price: 820, rarity: 'rare' },
  { id: 'nurse', name: 'Nurse', body: '#ffd6e0', accent: '#c9184a', eyes: 'round', pattern: 'ring', accessory: '💉', power: 'healer', price: 720, rarity: 'rare' },
  { id: 'werewolf', name: 'Werewolf', body: '#6d4c41', accent: '#1b120f', eyes: 'angry', pattern: 'spots', accessory: '🐺', power: 'brute', price: 1150, rarity: 'epic' },
  { id: 'vampire', name: 'Vampire', body: '#2b0a12', accent: '#e63946', eyes: 'angry', pattern: 'split', accessory: '🧛', power: 'hunter', price: 1250, rarity: 'epic' },
  { id: 'mummy', name: 'Mummy', body: '#e9dcc0', accent: '#7a6a4f', eyes: 'cyclops', pattern: 'stripes', accessory: '🧻', power: 'alpha', price: 1100, rarity: 'epic' },
  { id: 'wizard', name: 'Wizard', body: '#3a0ca3', accent: '#f9c74f', eyes: 'sleepy', pattern: 'spots', accessory: '🧙', power: 'master', price: 1350, rarity: 'epic' },
  { id: 'shadow', name: 'Shadow', body: '#141414', accent: '#5a5a5a', eyes: 'sleepy', pattern: 'none', accessory: '🌑', power: 'ghost', price: 1450, rarity: 'epic' },
  { id: 'cyborg', name: 'Cyborg', body: '#6c757d', accent: '#ff006e', eyes: 'cyclops', pattern: 'split', accessory: '🦾', power: 'swift', price: 1700, rarity: 'legendary' },
  { id: 'reaper', name: 'Reaper', body: '#1a1a2e', accent: '#c0c0c0', eyes: 'angry', pattern: 'ring', accessory: '⚰️', power: 'hunter', price: 1900, rarity: 'legendary' },
  { id: 'phoenix', name: 'Phoenix', body: '#ff5400', accent: '#ffbd00', eyes: 'angry', pattern: 'stripes', accessory: '🔥', power: 'healer', price: 2000, rarity: 'legendary' },
  { id: 'kraken', name: 'Kraken', body: '#0b6e4f', accent: '#08415c', eyes: 'cyclops', pattern: 'spots', accessory: '🐙', power: 'brute', price: 2100, rarity: 'legendary' },
  { id: 'champion', name: 'Tournament Champion', body: '#ffd166', accent: '#b8860b', eyes: 'angry', pattern: 'ring', accessory: '👑', power: 'swift', price: 0, rarity: 'exclusive' },
  // Medal skins: bought with medals only.
  { id: 'medalist', name: 'Medalist', body: '#fbbf24', accent: '#92400e', eyes: 'round', pattern: 'ring', accessory: '🏅', power: 'scout', price: 0, medalPrice: 12, rarity: 'epic' },
  { id: 'phantom', name: 'Phantom', body: '#312e81', accent: '#a5b4fc', eyes: 'sleepy', pattern: 'split', accessory: '🎭', power: 'ghost', price: 0, medalPrice: 25, rarity: 'legendary' },
  { id: 'overlord', name: 'Overlord', body: '#7f1d1d', accent: '#fca5a5', eyes: 'angry', pattern: 'stripes', accessory: '😈', power: 'master', price: 0, medalPrice: 40, rarity: 'legendary' },
  { id: 'veteran', name: 'Veteran', body: '#5c6b3a', accent: '#d4a017', eyes: 'angry', pattern: 'stripes', accessory: '🎖️', power: 'tank', price: 0, medalPrice: 15, rarity: 'epic' },
  { id: 'sentinel', name: 'Sentinel', body: '#e0e7ff', accent: '#1d4ed8', eyes: 'cyclops', pattern: 'ring', accessory: '🛡️', power: 'engineer', price: 0, medalPrice: 20, rarity: 'epic' },
  { id: 'plaguedoc', name: 'Plague Doctor', body: '#1f1f1f', accent: '#94d84a', eyes: 'cyclops', pattern: 'none', accessory: '🐦‍⬛', power: 'healer', price: 0, medalPrice: 30, rarity: 'legendary' },
  { id: 'patientzero', name: 'Patient Zero', body: '#94d84a', accent: '#ee4a3b', eyes: 'angry', pattern: 'spots', accessory: '☣️', power: 'alpha', price: 0, medalPrice: 50, rarity: 'legendary' },
];

export const DEFAULT_SKIN_ID = 'rookie';
export const STARTER_SKINS = ['rookie', 'camper'];

export function findSkin(id: string, customSkins: Skin[] = []): Skin {
  return (
    customSkins.find((s) => s.id === id) ??
    BUILT_IN_SKINS.find((s) => s.id === id) ??
    BUILT_IN_SKINS[0]
  );
}

export const RARITY_COLORS: Record<Skin['rarity'], string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
  exclusive: '#ef4444',
};

export const SKIN_COLOR_PALETTE = [
  '#4f8ef7', '#f4a259', '#5ed6a4', '#e8475f', '#2b2d42', '#f1f5f9', '#556b2f', '#d7e3fc',
  '#c9a227', '#7d8c3a', '#5b2a86', '#ffd166', '#ff7eb6', '#00b4d8', '#8d5524', '#111827',
  '#ef233c', '#22c55e', '#f97316', '#a3e635', '#14b8a6', '#6366f1', '#e5e7eb', '#78350f',
];

export const SKIN_ACCESSORIES = ['', '🎩', '🧢', '👑', '🪖', '🎧', '🕶️', '🌸', '⭐', '🔥', '🦴', '🎀', '🪶', '💀'];
