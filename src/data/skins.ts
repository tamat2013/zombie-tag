import type { Skin, SkinPowerId } from '../types.ts';

export const SKIN_POWERS: Record<SkinPowerId, { name: string; description: string }> = {
  swift: { name: 'זריז', description: '+8% מהירות תנועה' },
  healer: { name: 'מרפא', description: 'זמן טעינת יכולת הרופא קצר ב-30%' },
  tank: { name: 'טנק', description: 'חוסם את ההדבקה הראשונה במשחק' },
  ghost: { name: 'רוח', description: 'זומבים מזהים אותך ממרחק קצר ב-30%' },
  alpha: { name: 'אלפא', description: 'זמן טעינת הזינוק של הזומבי קצר ב-30%' },
  hunter: { name: 'צייד', description: '+15% טווח הדבקה' },
  scout: { name: 'סייר', description: '+15% טווח ראייה' },
  engineer: { name: 'מהנדס', description: 'משימות מהירות ב-25%' },
  master: { name: 'מאסטר', description: 'כל היכולות נטענות מהר ב-15%' },
  brute: { name: 'בריון', description: '+8% מהירות כשאתה זומבי' },
};

export const BUILT_IN_SKINS: Skin[] = [
  { id: 'rookie', name: 'טירון', body: '#4f8ef7', accent: '#1f3f7a', eyes: 'round', pattern: 'none', accessory: '', price: 0, rarity: 'common' },
  { id: 'camper', name: 'חניך', body: '#f4a259', accent: '#8c4a12', eyes: 'round', pattern: 'stripes', accessory: '', price: 0, rarity: 'common' },
  { id: 'mint', name: 'מנטה', body: '#5ed6a4', accent: '#1e6b4d', eyes: 'sleepy', pattern: 'spots', accessory: '', price: 150, rarity: 'common' },
  { id: 'cherry', name: 'דובדבן', body: '#e8475f', accent: '#7a1525', eyes: 'round', pattern: 'ring', accessory: '', price: 150, rarity: 'common' },
  { id: 'ninja', name: 'נינג׳ה', body: '#2b2d42', accent: '#ef233c', eyes: 'angry', pattern: 'split', accessory: '🥷', power: 'swift', price: 900, rarity: 'epic' },
  { id: 'doc', name: 'ד״ר פלסטר', body: '#f1f5f9', accent: '#e11d48', eyes: 'round', pattern: 'ring', accessory: '🩺', power: 'healer', price: 700, rarity: 'rare' },
  { id: 'tank', name: 'טנק', body: '#556b2f', accent: '#2f3b1a', eyes: 'angry', pattern: 'stripes', accessory: '🪖', power: 'tank', price: 1200, rarity: 'epic' },
  { id: 'ghost', name: 'רוח רפאים', body: '#d7e3fc', accent: '#8ea8d8', eyes: 'sleepy', pattern: 'none', accessory: '👻', power: 'ghost', price: 1500, rarity: 'legendary' },
  { id: 'scout', name: 'סיירת', body: '#c9a227', accent: '#6b5208', eyes: 'round', pattern: 'spots', accessory: '🔭', power: 'scout', price: 800, rarity: 'rare' },
  { id: 'alpha', name: 'זומבי אלפא', body: '#7d8c3a', accent: '#3d1a1a', eyes: 'angry', pattern: 'split', accessory: '🦴', power: 'alpha', price: 1400, rarity: 'legendary' },
  { id: 'hunter', name: 'צייד לילה', body: '#5b2a86', accent: '#1d0b2e', eyes: 'cyclops', pattern: 'ring', accessory: '🗡️', power: 'hunter', price: 1100, rarity: 'epic' },
  { id: 'pumpkin', name: 'דלעת', body: '#f77f00', accent: '#5a2e00', eyes: 'angry', pattern: 'stripes', accessory: '🎃', price: 250, rarity: 'common' },
  { id: 'ice', name: 'קרחון', body: '#a8e6ff', accent: '#1d6fa3', eyes: 'sleepy', pattern: 'spots', accessory: '❄️', price: 300, rarity: 'common' },
  { id: 'pirate', name: 'פיראט', body: '#8d5524', accent: '#111827', eyes: 'cyclops', pattern: 'stripes', accessory: '🏴‍☠️', price: 450, rarity: 'rare' },
  { id: 'rainbow', name: 'קשת', body: '#ff7eb6', accent: '#6366f1', eyes: 'round', pattern: 'split', accessory: '🌈', price: 500, rarity: 'rare' },
  { id: 'robot', name: 'רובוט', body: '#9ca3af', accent: '#00b4d8', eyes: 'cyclops', pattern: 'ring', accessory: '🤖', power: 'engineer', price: 950, rarity: 'epic' },
  { id: 'astronaut', name: 'אסטרונאוט', body: '#e5e7eb', accent: '#1e3a8a', eyes: 'round', pattern: 'ring', accessory: '🚀', power: 'swift', price: 1000, rarity: 'epic' },
  { id: 'lava', name: 'לבה', body: '#ef233c', accent: '#f97316', eyes: 'angry', pattern: 'spots', accessory: '🌋', power: 'brute', price: 1300, rarity: 'epic' },
  { id: 'dragon', name: 'דרקון', body: '#14b8a6', accent: '#064e3b', eyes: 'angry', pattern: 'stripes', accessory: '🐉', power: 'master', price: 2200, rarity: 'legendary' },
  { id: 'champion', name: 'אלוף הטורניר', body: '#ffd166', accent: '#b8860b', eyes: 'angry', pattern: 'ring', accessory: '👑', power: 'swift', price: 0, rarity: 'exclusive' },
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
