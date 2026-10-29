// Shop: skins, outfits, abilities, upgrades, zombie filters and the medal shop.
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps, ShopTab } from '../navigation/types';
import type { AbilityId, Role, Skin, UpgradeId } from '../types';
import { Screen, ScreenHeader, Card, H, P, Tabs, ProgressBar, Chip, Coin, Tag, HazardStripe } from '../components/ui';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { BUILT_IN_SKINS, RARITY_COLORS, SKIN_POWERS, findSkin } from '../data/skins';
import { ABILITY_PRICES, MEDAL_TO_COINS, OUTFITS, UPGRADES, ZOMBIE_FILTERS, upgradeMinLevel, upgradePrice } from '../data/catalog';
import type { Outfit, ZombieFilter } from '../data/catalog';
import { ABILITIES, MAX_LOADOUT } from '../engine/abilities';
import { buyAbility, buyFilter, buyOutfit, buySkin, buySkinWithMedals, buyUpgrade, convertMedals, toggleLoadout } from '../logic/shop';
import type { ShopResult } from '../logic/shop';
import { levelInfo } from '../logic/progression';
import { colors } from '../theme';
import { haptic } from '../utils/haptics';

const TABS: { id: ShopTab; label: string }[] = [
  { id: 'skins', label: 'Skins' },
  { id: 'outfits', label: 'Outfits' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'filters', label: 'Zombie filters' },
  { id: 'coins', label: 'Medal shop' },
];

type Show = 'all' | 'coins' | 'medals' | 'owned';
const SHOW: { id: Show; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'coins', label: 'Coins' },
  { id: 'medals', label: 'Medals' },
  { id: 'owned', label: 'Owned' },
];

const UPGRADE_ICON: Record<UpgradeId, IconName> = {
  speed: 'run-fast',
  cooldown: 'lightning-bolt',
  vision: 'flashlight',
  taskSpeed: 'toolbox-outline',
  stealth: 'shoe-print',
  firstAid: 'medical-bag',
  reach: 'hand-back-right-outline',
  rotLegs: 'walk',
  deadEyes: 'eye-outline',
  keenEars: 'ear-hearing',
  bloodPump: 'heart-pulse',
};

const UPGRADE_GROUPS: { title: string; color: string; ids: UpgradeId[] }[] = [
  { title: 'Everyone', color: colors.gold, ids: ['speed', 'cooldown', 'vision'] },
  { title: 'Survivor', color: colors.survivor, ids: ['taskSpeed', 'stealth', 'firstAid'] },
  { title: 'Zombie', color: colors.zombie, ids: ['reach', 'rotLegs', 'deadEyes', 'keenEars', 'bloodPump'] },
];

const RARITY_LABEL: Record<Skin['rarity'], string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  exclusive: 'Exclusive',
};

type Apply = (r: ShopResult, success: string, icon?: string) => void;

export function ShopScreen({ route }: ScreenProps<'Shop'>) {
  const [tab, setTab] = useState<ShopTab>(route.params?.tab ?? 'skins');
  const { updateProfile, toast } = useGame();

  const apply: Apply = (r, success, icon = '🛒') => {
    if (r.ok) {
      updateProfile(r.profile);
      haptic('success');
      toast(success, { icon, tone: 'good' });
    } else {
      haptic('error');
      toast(r.error, { tone: 'bad' });
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Shop" />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <View style={{ marginTop: 14 }}>
        {tab === 'skins' ? <SkinsTab apply={apply} /> : null}
        {tab === 'outfits' ? <OutfitsTab apply={apply} /> : null}
        {tab === 'abilities' ? <AbilitiesTab apply={apply} /> : null}
        {tab === 'upgrades' ? <UpgradesTab apply={apply} /> : null}
        {tab === 'filters' ? <FiltersTab apply={apply} /> : null}
        {tab === 'coins' ? <MedalShopTab apply={apply} /> : null}
      </View>
    </Screen>
  );
}

/** A gold buy button showing a coin or medal and the amount, or the level needed. */
function PriceButton({ price, medals, needLevel, onPress }: { price: number; medals?: boolean; needLevel?: number; onPress: () => void }) {
  const profile = useProfile();
  const level = levelInfo(profile.xp).level;
  if (needLevel && level < needLevel) {
    return <Button small variant="dark" title={`Level ${needLevel}`} lead={<Icon name="lock-outline" size={14} color={colors.textDim} />} disabled />;
  }
  const short = medals ? profile.medals < price : profile.coins < price;
  return (
    <Button
      small
      variant="gold"
      title={price.toLocaleString()}
      lead={medals ? <Icon name="medal" size={15} color={colors.ink} /> : <Coin size={13} />}
      disabled={short}
      onPress={onPress}
    />
  );
}

function ShowFilter({ value, onChange }: { value: Show; onChange: (s: Show) => void }) {
  return (
    <View style={styles.chips}>
      {SHOW.map((s) => (
        <Chip key={s.id} label={s.label} active={value === s.id} onPress={() => onChange(s.id)} color={colors.gold} />
      ))}
    </View>
  );
}

function SectionTitle({ text, color = colors.gold, count }: { text: string; color?: string; count?: string }) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionBar, { backgroundColor: color }]} />
      <Text style={styles.sectionText}>{text}</Text>
      {count ? <Text style={styles.sectionCount}>{count}</Text> : null}
    </View>
  );
}

// ---------- Skins ----------

function SkinCard({ s, apply }: { s: Skin; apply: Apply }) {
  const profile = useProfile();
  const { updateProfile } = useGame();
  const owned = profile.ownedSkins.includes(s.id);
  const selected = profile.selectedSkinId === s.id;
  return (
    <Card style={styles.item} highlight={selected ? colors.toxic : undefined}>
      <Tag text={RARITY_LABEL[s.rarity]} color={RARITY_COLORS[s.rarity]} tilt={-4} style={styles.cornerTag} />
      <Character skin={s} size={60} />
      <Text style={styles.itemName} numberOfLines={1}>
        {s.name}
      </Text>
      <Text style={styles.power} numberOfLines={2}>
        {s.power ? SKIN_POWERS[s.power].description : ' '}
      </Text>
      {owned ? (
        <Button small title={selected ? 'Selected' : 'Select'} variant={selected ? 'dark' : 'primary'} disabled={selected} onPress={() => updateProfile((p) => ({ ...p, selectedSkinId: s.id }))} />
      ) : s.rarity === 'exclusive' ? (
        <Button small title="Tournament prize" variant="dark" lead={<Icon name="trophy-outline" size={14} color={colors.gold} />} disabled />
      ) : s.medalPrice ? (
        <PriceButton price={s.medalPrice} medals onPress={() => apply(buySkinWithMedals(profile, s.id), `The ${s.name} skin is yours!`, '🏅')} />
      ) : (
        <PriceButton price={s.price} onPress={() => apply(buySkin(profile, s.id), `The ${s.name} skin is yours!`, '🎨')} />
      )}
    </Card>
  );
}

function SkinsTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  const [show, setShow] = useState<Show>('all');
  const featured = BUILT_IN_SKINS.filter((s) => s.medalPrice && !profile.ownedSkins.includes(s.id)).sort((a, b) => (b.medalPrice ?? 0) - (a.medalPrice ?? 0))[0];
  const list = BUILT_IN_SKINS.filter((s) => {
    if (show === 'owned') return profile.ownedSkins.includes(s.id);
    if (show === 'medals') return !!s.medalPrice;
    if (show === 'coins') return !s.medalPrice && s.rarity !== 'exclusive';
    return true;
  });
  const owned = BUILT_IN_SKINS.filter((s) => profile.ownedSkins.includes(s.id)).length;
  return (
    <View style={{ gap: 12 }}>
      {featured && show === 'all' ? <FeaturedSkin s={featured} apply={apply} /> : null}
      <ShowFilter value={show} onChange={setShow} />
      <SectionTitle text="Skins" count={`${owned}/${BUILT_IN_SKINS.length}`} />
      <View style={styles.grid}>
        {list.map((s) => (
          <SkinCard key={s.id} s={s} apply={apply} />
        ))}
      </View>
    </View>
  );
}

function FeaturedSkin({ s, apply }: { s: Skin; apply: Apply }) {
  const profile = useProfile();
  return (
    <View style={styles.featured}>
      <HazardStripe height={10} color={colors.medal} />
      <View style={styles.featuredBody}>
        <View style={styles.featuredArt}>
          <Character skin={s} size={84} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Tag text="Medal skin" color={colors.medal} />
          <Text style={styles.featuredName}>{s.name}</Text>
          {s.power ? <Text style={styles.power}>{SKIN_POWERS[s.power].description}</Text> : null}
          <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            <PriceButton price={s.medalPrice!} medals onPress={() => apply(buySkinWithMedals(profile, s.id), `The ${s.name} skin is yours!`, '🏅')} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------- Outfits ----------

function OutfitCard({ o, apply }: { o: Outfit; apply: Apply }) {
  const profile = useProfile();
  const { updateProfile } = useGame();
  const owned = profile.ownedOutfits.includes(o.id);
  const equipped = profile.equippedOutfit === o.id;
  return (
    <Card style={styles.item} highlight={equipped ? colors.toxic : undefined}>
      {o.medalPrice ? <Tag text="Medals" color={colors.medal} tilt={-4} style={styles.cornerTag} /> : null}
      <Character skin={findSkin(profile.selectedSkinId, profile.customSkins)} size={56} outfit={o.emoji} />
      <Text style={styles.itemName} numberOfLines={1}>
        {o.name}
      </Text>
      {owned ? (
        <Button small title={equipped ? 'Remove' : 'Wear'} variant={equipped ? 'dark' : 'primary'} onPress={() => updateProfile((p) => ({ ...p, equippedOutfit: equipped ? null : o.id }))} />
      ) : (
        <PriceButton
          price={o.medalPrice ?? o.price}
          medals={!!o.medalPrice}
          needLevel={o.medalPrice ? undefined : o.minLevel}
          onPress={() => apply(buyOutfit(profile, o.id), `Bought ${o.name}`, o.emoji)}
        />
      )}
    </Card>
  );
}

function OutfitsTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  const [show, setShow] = useState<Show>('all');
  const list = OUTFITS.filter((o) => {
    if (show === 'owned') return profile.ownedOutfits.includes(o.id);
    if (show === 'medals') return !!o.medalPrice;
    if (show === 'coins') return !o.medalPrice;
    return true;
  }).sort((a, b) => (a.medalPrice ? 1 : 0) - (b.medalPrice ? 1 : 0) || a.minLevel - b.minLevel || a.price - b.price);
  return (
    <View style={{ gap: 12 }}>
      <ShowFilter value={show} onChange={setShow} />
      <SectionTitle text="Outfits" count={`${profile.ownedOutfits.length}/${OUTFITS.length}`} />
      <View style={styles.grid}>
        {list.map((o) => (
          <OutfitCard key={o.id} o={o} apply={apply} />
        ))}
      </View>
    </View>
  );
}

// ---------- Abilities ----------

function AbilitiesTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  const roles: { role: Role; title: string; color: string }[] = [
    { role: 'survivor', title: 'Survivor abilities', color: colors.survivor },
    { role: 'zombie', title: 'Zombie abilities', color: colors.zombie },
  ];
  return (
    <View style={{ gap: 16 }}>
      <P dim>Pick up to {MAX_LOADOUT} abilities per role. They show up as buttons in the match, and the smart ability helper highlights when each one is worth using.</P>
      {roles.map(({ role, title, color }) => (
        <View key={role} style={{ gap: 8 }}>
          <SectionTitle text={title} color={color} count={`${profile.loadout[role].length}/${MAX_LOADOUT}`} />
          {Object.values(ABILITIES)
            .filter((a) => a.role === role)
            .sort((a, b) => (ABILITY_PRICES[a.id]?.minLevel ?? 0) - (ABILITY_PRICES[b.id]?.minLevel ?? 0))
            .map((a) => {
              const owned = profile.ownedAbilities.includes(a.id);
              const equipped = profile.loadout[role].includes(a.id);
              const price = ABILITY_PRICES[a.id as AbilityId];
              return (
                <Card key={a.id} style={styles.row} highlight={equipped ? colors.toxic : undefined}>
                  <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={{ fontSize: 24 }}>{a.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <H size={15}>{a.name}</H>
                    <P dim>{a.description}</P>
                    <View style={styles.meta}>
                      <Icon name="timer-sand" size={13} color={colors.textMuted} />
                      <Text style={styles.metaText}>{a.cooldownSec}s</Text>
                    </View>
                  </View>
                  {owned ? (
                    <Button
                      small
                      title={equipped ? 'Equipped' : 'Equip'}
                      lead={equipped ? <Icon name="check-bold" size={14} color={colors.text} /> : undefined}
                      variant={equipped ? 'dark' : 'primary'}
                      onPress={() => apply(toggleLoadout(profile, role, a.id), equipped ? `${a.name} removed` : `${a.name} equipped`, a.icon)}
                    />
                  ) : price ? (
                    <PriceButton price={price.price} needLevel={price.minLevel} onPress={() => apply(buyAbility(profile, a.id), `${a.name} unlocked!`, a.icon)} />
                  ) : null}
                </Card>
              );
            })}
        </View>
      ))}
    </View>
  );
}

// ---------- Upgrades ----------

function UpgradesTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  return (
    <View style={{ gap: 16 }}>
      {UPGRADE_GROUPS.map((g) => (
        <View key={g.title} style={{ gap: 8 }}>
          <SectionTitle text={g.title} color={g.color} />
          {g.ids.map((id) => {
            const u = UPGRADES.find((x) => x.id === id)!;
            const cur = profile.upgrades[u.id] ?? 0;
            const max = cur >= u.maxLevel;
            return (
              <Card key={u.id} style={styles.row}>
                <View style={[styles.badge, { backgroundColor: g.color }]}>
                  <Icon name={UPGRADE_ICON[u.id]} size={24} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <H size={15}>{u.name}</H>
                  <P dim>{u.description}</P>
                  <View style={styles.pips}>
                    {Array.from({ length: u.maxLevel }, (_, i) => (
                      <View key={i} style={[styles.pip, i < cur && { backgroundColor: g.color }]} />
                    ))}
                  </View>
                </View>
                {max ? (
                  <Tag text="Max" color={colors.toxic} tilt={3} />
                ) : (
                  <PriceButton price={upgradePrice(u, cur)} needLevel={upgradeMinLevel(cur)} onPress={() => apply(buyUpgrade(profile, u.id), `${u.name} upgraded to level ${cur + 1}`, u.icon)} />
                )}
              </Card>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---------- Filters ----------

function FilterRow({ f, apply }: { f: ZombieFilter; apply: Apply }) {
  const profile = useProfile();
  const { updateProfile } = useGame();
  const owned = profile.ownedFilters.includes(f.id);
  const equipped = profile.equippedFilter === f.id;
  return (
    <Card style={styles.row} highlight={equipped ? colors.toxic : undefined}>
      <View style={[styles.filterSwatch, { backgroundColor: f.vignette }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: f.color, opacity: f.opacity * 3 }]} />
        <Text style={{ fontSize: 22 }}>🧟</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <H size={15}>{f.name}</H>
          {f.medalPrice ? <Tag text="Medals" color={colors.medal} tilt={-3} /> : null}
        </View>
        <P dim>{f.description}</P>
        {Object.keys(f.bonus).length ? (
          <View style={styles.meta}>
            <Icon name="arrow-up-bold" size={13} color={colors.toxic} />
            <Text style={styles.perk}>{f.perk}</Text>
          </View>
        ) : null}
      </View>
      {owned ? (
        <Button small title={equipped ? 'Active' : 'Use'} variant={equipped ? 'dark' : 'primary'} disabled={equipped} onPress={() => updateProfile((p) => ({ ...p, equippedFilter: f.id }))} />
      ) : (
        <PriceButton price={f.medalPrice ?? f.price} medals={!!f.medalPrice} onPress={() => apply(buyFilter(profile, f.id), `Bought the ${f.name} filter`, '🧟')} />
      )}
    </Card>
  );
}

function FiltersTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  const list = [...ZOMBIE_FILTERS].sort((a, b) => (a.medalPrice ? 1 : 0) - (b.medalPrice ? 1 : 0) || a.price - b.price);
  return (
    <View style={{ gap: 10 }}>
      <P dim>A filter tints your screen while you are a zombie, and each filter gives your zombie a bonus in the match.</P>
      <SectionTitle text="Zombie filters" color={colors.zombie} count={`${profile.ownedFilters.length}/${ZOMBIE_FILTERS.length}`} />
      {list.map((f) => (
        <FilterRow key={f.id} f={f} apply={apply} />
      ))}
    </View>
  );
}

// ---------- Medal shop ----------

function MedalShopTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  const skins = BUILT_IN_SKINS.filter((s) => s.medalPrice).sort((a, b) => a.medalPrice! - b.medalPrice!);
  const outfits = OUTFITS.filter((o) => o.medalPrice).sort((a, b) => a.medalPrice! - b.medalPrice!);
  const filters = ZOMBIE_FILTERS.filter((f) => f.medalPrice);
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.medalHero}>
        <Icon name="medal" size={44} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <Text style={styles.medalCount}>{profile.medals}</Text>
          <Text style={styles.medalHint}>Earn medals in tournaments and obstacle runs. Spend them on items you cannot buy with coins.</Text>
        </View>
      </View>

      <SectionTitle text="Medal skins" color={colors.medal} />
      <View style={styles.grid}>
        {skins.map((s) => (
          <SkinCard key={s.id} s={s} apply={apply} />
        ))}
      </View>

      <SectionTitle text="Medal outfits" color={colors.medal} />
      <View style={styles.grid}>
        {outfits.map((o) => (
          <OutfitCard key={o.id} o={o} apply={apply} />
        ))}
      </View>

      <SectionTitle text="Medal filters" color={colors.medal} />
      {filters.map((f) => (
        <FilterRow key={f.id} f={f} apply={apply} />
      ))}

      <SectionTitle text="Swap medals for coins" color={colors.gold} />
      <Card>
        <P dim>Each medal is worth {MEDAL_TO_COINS} coins.</P>
        <View style={styles.convert}>
          {[1, 5, 10].map((n) => (
            <Button
              key={n}
              small
              variant="dark"
              title={`${n} → ${n * MEDAL_TO_COINS}`}
              lead={<Coin size={12} />}
              disabled={profile.medals < n}
              onPress={() => apply(convertMedals(profile, n), `You got ${n * MEDAL_TO_COINS} coins`, '🪙')}
            />
          ))}
          <Button small variant="gold" title="Convert all" disabled={profile.medals < 1} onPress={() => apply(convertMedals(profile, profile.medals), `You got ${profile.medals * MEDAL_TO_COINS} coins`, '🪙')} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { width: 150, alignItems: 'center', gap: 6, paddingTop: 20, paddingBottom: 12 },
  cornerTag: { position: 'absolute', top: -8, left: 8, zIndex: 2 },
  itemName: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  power: { color: colors.textDim, fontSize: 11, textAlign: 'center', minHeight: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  pips: { flexDirection: 'row', gap: 4, marginTop: 6 },
  pip: { flex: 1, maxWidth: 28, height: 8, borderRadius: 3, backgroundColor: colors.bgAlt, borderWidth: 2, borderColor: colors.ink },
  filterSwatch: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.ink },
  perk: { color: colors.toxic, fontWeight: '700', fontSize: 12, flexShrink: 1 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionBar: { width: 6, height: 18, borderRadius: 2, borderWidth: 1.5, borderColor: colors.ink },
  sectionText: { color: colors.text, fontSize: 17, fontWeight: '900', flex: 1, textAlign: 'left' },
  sectionCount: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  featured: { borderRadius: 16, borderWidth: 2, borderBottomWidth: 6, borderColor: colors.ink, backgroundColor: colors.panel, overflow: 'hidden' },
  featuredBody: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  featuredArt: { width: 104, height: 104, borderRadius: 14, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  featuredName: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'left' },
  medalHero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.medal, borderRadius: 16, padding: 16, borderWidth: 2, borderBottomWidth: 6, borderColor: colors.ink },
  medalCount: { color: colors.ink, fontSize: 34, fontWeight: '900', textAlign: 'left' },
  medalHint: { color: colors.ink, fontSize: 13, fontWeight: '500', textAlign: 'left', opacity: 0.8 },
  convert: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
});
