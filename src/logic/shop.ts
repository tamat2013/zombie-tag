// Shop transactions. Each returns the updated profile, or an error message in Hebrew.
import type { AbilityId, Profile, Role, UpgradeId } from '../types.ts';
import { ABILITY_PRICES, MEDAL_TO_COINS, OUTFITS, UPGRADES, ZOMBIE_FILTERS, upgradeMinLevel, upgradePrice } from '../data/catalog.ts';
import { BUILT_IN_SKINS } from '../data/skins.ts';
import { ABILITIES, MAX_LOADOUT } from '../engine/abilities.ts';
import { levelInfo } from './progression.ts';

export type ShopResult = { ok: true; profile: Profile } | { ok: false; error: string };

const fail = (error: string): ShopResult => ({ ok: false, error });

function spend(p: Profile, price: number): Profile | null {
  return p.coins >= price ? { ...p, coins: p.coins - price } : null;
}

export function buySkin(p: Profile, skinId: string): ShopResult {
  const skin = BUILT_IN_SKINS.find((s) => s.id === skinId);
  if (!skin) return fail('סקין לא נמצא');
  if (skin.rarity === 'exclusive') return fail('סקין בלעדי – אפשר לזכות בו רק בטורניר');
  if (p.ownedSkins.includes(skinId)) return fail('כבר יש לך את הסקין הזה');
  const next = spend(p, skin.price);
  if (!next) return fail('אין מספיק מטבעות');
  return { ok: true, profile: { ...next, ownedSkins: [...p.ownedSkins, skinId] } };
}

export function buyOutfit(p: Profile, outfitId: string): ShopResult {
  const o = OUTFITS.find((x) => x.id === outfitId);
  if (!o) return fail('פריט לא נמצא');
  if (p.ownedOutfits.includes(outfitId)) return fail('כבר קנית את הפריט הזה');
  if (levelInfo(p.xp).level < o.minLevel) return fail(`נדרשת רמה ${o.minLevel}`);
  const next = spend(p, o.price);
  if (!next) return fail('אין מספיק מטבעות');
  return { ok: true, profile: { ...next, ownedOutfits: [...p.ownedOutfits, outfitId] } };
}

export function buyFilter(p: Profile, filterId: string): ShopResult {
  const f = ZOMBIE_FILTERS.find((x) => x.id === filterId);
  if (!f) return fail('מסנן לא נמצא');
  if (p.ownedFilters.includes(filterId)) return fail('כבר יש לך את המסנן הזה');
  const next = spend(p, f.price);
  if (!next) return fail('אין מספיק מטבעות');
  return { ok: true, profile: { ...next, ownedFilters: [...p.ownedFilters, filterId] } };
}

export function buyUpgrade(p: Profile, id: UpgradeId): ShopResult {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return fail('שדרוג לא נמצא');
  const cur = p.upgrades[id] ?? 0;
  if (cur >= def.maxLevel) return fail('השדרוג ברמה המקסימלית');
  const need = upgradeMinLevel(cur);
  if (levelInfo(p.xp).level < need) return fail(`נדרשת רמת שחקן ${need}`);
  const next = spend(p, upgradePrice(def, cur));
  if (!next) return fail('אין מספיק מטבעות');
  return { ok: true, profile: { ...next, upgrades: { ...p.upgrades, [id]: cur + 1 } } };
}

export function buyAbility(p: Profile, id: AbilityId): ShopResult {
  const price = ABILITY_PRICES[id];
  if (!price) return fail('יכולת לא למכירה');
  if (p.ownedAbilities.includes(id)) return fail('כבר יש לך את היכולת');
  if (levelInfo(p.xp).level < price.minLevel) return fail(`נדרשת רמה ${price.minLevel}`);
  const next = spend(p, price.price);
  if (!next) return fail('אין מספיק מטבעות');
  return { ok: true, profile: { ...next, ownedAbilities: [...p.ownedAbilities, id] } };
}

export function convertMedals(p: Profile, medals: number): ShopResult {
  if (medals <= 0 || !Number.isInteger(medals)) return fail('כמות לא תקינה');
  if (p.medals < medals) return fail('אין מספיק מדליות');
  return { ok: true, profile: { ...p, medals: p.medals - medals, coins: p.coins + medals * MEDAL_TO_COINS } };
}

export function toggleLoadout(p: Profile, role: Role, id: AbilityId): ShopResult {
  if (ABILITIES[id].role !== role) return fail('היכולת לא מתאימה לתפקיד');
  if (!p.ownedAbilities.includes(id)) return fail('היכולת לא בבעלותך');
  const cur = p.loadout[role];
  let next: AbilityId[];
  if (cur.includes(id)) {
    if (cur.length <= 1) return fail('צריך לפחות יכולת אחת');
    next = cur.filter((a) => a !== id);
  } else {
    if (cur.length >= MAX_LOADOUT) return fail(`אפשר לצייד עד ${MAX_LOADOUT} יכולות`);
    next = [...cur, id];
  }
  return { ok: true, profile: { ...p, loadout: { ...p.loadout, [role]: next } } };
}
