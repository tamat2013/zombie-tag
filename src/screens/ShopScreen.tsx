// Shop: skins, outfits, abilities, upgrades, zombie filters and the medal shop.
// Desktop shows storefront tiles in sections. The phone shows each tab as one paged grid of compact tiles, so nothing scrolls.
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps, ShopTab } from '../navigation/types';
import type { AbilityId, Role, Skin, UpgradeId } from '../types';
import { Screen, ScreenHeader, Grid, P, Tabs, ProgressBar, Chip, Coin, Tag } from '../components/ui';
import { useDevice } from '../utils/device';
import { Button } from '../components/Button';
import { Icon, Glyph } from '../components/Icon';
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
import { colors, fonts, radius } from '../theme';
import { haptic } from '../utils/haptics';

const TAB_ICONS: Record<ShopTab, IconName> = {
  skins: 'tshirt-crew-outline', outfits: 'hat-fedora', abilities: 'flash-outline', upgrades: 'arrow-up-bold-circle-outline', filters: 'virus-outline', coins: 'medal-outline',
};

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
type Profile = ReturnType<typeof useProfile>;
type UpdateProfile = ReturnType<typeof useGame>['updateProfile'];
type AbilityDef = (typeof ABILITIES)[keyof typeof ABILITIES];

/** What the item builders need: the player, the purchase callbacks and whether cards are drawn at desktop size. */
interface Ctx {
  profile: Profile;
  updateProfile: UpdateProfile;
  apply: Apply;
  big: boolean;
}

/** One shop item. Desktop draws it as a storefront tile, the phone as a compact tile. */
interface Entry {
  key: string;
  accent: string;
  tag?: string;
  selected?: boolean;
  art: React.ReactNode;
  title: string;
  sub?: string;
  meta?: React.ReactNode;
  action: React.ReactNode;
}

interface Group {
  title: string;
  color: string;
  kind: 'show' | 'slot';
  count?: string;
  entries: Entry[];
}

function useCtx(apply: Apply): Ctx {
  const profile = useProfile();
  const { updateProfile } = useGame();
  const { isDesktop } = useDevice();
  return { profile, updateProfile, apply, big: isDesktop };
}

export function ShopScreen({ route }: ScreenProps<'Shop'>) {
  const [tab, setTab] = useState<ShopTab>(route.params?.tab ?? 'skins');
  const { updateProfile, toast } = useGame();

  const apply: Apply = (r, success, icon) => {
    if (r.ok) {
      updateProfile(r.profile);
      haptic('success');
      toast(success, { icon, tone: 'good' });
    } else {
      haptic('error');
      toast(r.error, { tone: 'bad' });
    }
  };

  const { isDesktop } = useDevice();
  const content = (
    <View style={styles.content}>
      {tab === 'skins' ? <SkinsTab apply={apply} /> : null}
      {tab === 'outfits' ? <OutfitsTab apply={apply} /> : null}
      {tab === 'abilities' ? <AbilitiesTab apply={apply} /> : null}
      {tab === 'upgrades' ? <UpgradesTab apply={apply} /> : null}
      {tab === 'filters' ? <FiltersTab apply={apply} /> : null}
      {tab === 'coins' ? <MedalShopTab apply={apply} /> : null}
    </View>
  );

  return (
    <Screen scroll shell="Shop">
      <ScreenHeader title="Shop" />
      {isDesktop ? (
        <View style={styles.deskRow}>
          <View style={styles.rail}>
            {TABS.map((t) => (
              <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.railItem, tab === t.id && styles.railItemOn]}>
                <Icon name={TAB_ICONS[t.id]} size={22} color={tab === t.id ? colors.ink : colors.textDim} />
                <Text style={[styles.railText, tab === t.id && { color: colors.ink }]}>{t.label}</Text>
              </Pressable>
            ))}
            <Locker />
          </View>
          {content}
        </View>
      ) : (
        <>
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          {content}
        </>
      )}
    </Screen>
  );
}

/** Desktop rail footer: the player's current look, level and balances, so purchases can be judged at a glance. */
function Locker() {
  const profile = useProfile();
  const li = levelInfo(profile.xp);
  const outfit = OUTFITS.find((o) => o.id === profile.equippedOutfit);
  return (
    <View style={styles.locker}>
      <View style={styles.lockerArt}>
        <Character skin={findSkin(profile.selectedSkinId, profile.customSkins)} size={96} outfit={outfit?.emoji} />
      </View>
      <Text style={styles.lockerLevel}>Level {li.level}</Text>
      <ProgressBar value={li.progress} style={{ alignSelf: 'stretch' }} color={colors.toxic} />
      <View style={styles.lockerBal}>
        <View style={styles.lockerChip}>
          <Coin size={14} />
          <Text style={styles.lockerNum}>{profile.coins.toLocaleString()}</Text>
        </View>
        <View style={styles.lockerChip}>
          <Icon name="medal" size={16} color={colors.medal} />
          <Text style={styles.lockerNum}>{profile.medals}</Text>
        </View>
      </View>
    </View>
  );
}

/** Desktop storefront tile: a tinted stage with the item art, a ribbon tag, name, blurb and one action. */
function Showcase({ accent, tag, art, title, sub, action, selected }: { accent: string; tag?: string; art: React.ReactNode; title: string; sub?: string; action: React.ReactNode; selected?: boolean }) {
  return (
    <View style={[styles.show, selected && { borderColor: colors.toxic }]}>
      <View style={[styles.stage, { backgroundColor: accent + '33' }]}>
        <View style={[styles.stageGlow, { backgroundColor: accent + '40' }]} />
        {art}
        {tag ? (
          <View style={[styles.ribbon, { backgroundColor: accent }]}>
            <Text style={styles.ribbonText}>{tag}</Text>
          </View>
        ) : null}
        {selected ? (
          <View style={styles.tick}>
            <Icon name="check-bold" size={14} color={colors.ink} />
          </View>
        ) : null}
      </View>
      <View style={styles.showBody}>
        <Text style={styles.itemName} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.power} numberOfLines={2}>
          {sub ?? ' '}
        </Text>
        {action}
      </View>
    </View>
  );
}

/** Desktop wide slot for abilities, upgrades and filters: icon plate, title and blurb on top, meta and action in a footer. */
function Slot({ accent, plate, title, desc, meta, action, selected }: { accent: string; plate: React.ReactNode; title: string; desc: string; meta?: React.ReactNode; action: React.ReactNode; selected?: boolean }) {
  return (
    <View style={[styles.slot, selected && { borderColor: colors.toxic }]}>
      <View style={styles.slotHead}>
        <View style={[styles.slotPlate, { backgroundColor: accent }]}>{plate}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.slotTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.slotDesc} numberOfLines={3}>
            {desc}
          </Text>
        </View>
      </View>
      <View style={styles.slotFoot}>
        <View style={{ flex: 1 }}>{meta}</View>
        {action}
      </View>
    </View>
  );
}

/** Phone tile: art on the left, name and detail on the right, the action at the bottom. */
function MiniCard({ entry }: { entry: Entry }) {
  const { accent, tag, selected, art, title, sub, meta, action } = entry;
  return (
    <View style={[styles.mini, selected && { borderColor: colors.toxic }]}>
      <View style={[styles.miniArt, { backgroundColor: accent + '33' }]}>
        {art}
        {tag ? (
          <Text style={[styles.miniTag, { backgroundColor: accent }]} numberOfLines={1}>
            {tag}
          </Text>
        ) : null}
      </View>
      <View style={styles.miniBody}>
        <Text style={styles.miniName} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.miniSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
        {meta}
        <View style={styles.miniAction}>{action}</View>
      </View>
    </View>
  );
}

/**
 * The items of a tab. Desktop: one section per group, each a wrapping grid, with the toolbar above.
 * Phone: every group flattened into one paged grid, with the toolbar in its footer.
 */
function Shelf({ groups, toolbar }: { groups: Group[]; toolbar?: React.ReactNode }) {
  const { isDesktop } = useDevice();
  if (!isDesktop) {
    return <Grid paged items={groups.flatMap((g) => g.entries)} minWidth={190} minHeight={74} gap={8} footer={toolbar} renderItem={(e) => <MiniCard entry={e} />} />;
  }
  return (
    <View style={{ gap: 16 }}>
      {toolbar}
      {groups.map((g) => (
        <View key={g.title} style={{ gap: 8 }}>
          <SectionTitle text={g.title} color={g.color} count={g.count} />
          <View style={styles.grid}>
            {g.entries.map((e) =>
              g.kind === 'show' ? (
                <Showcase key={e.key} accent={e.accent} tag={e.tag} art={e.art} title={e.title} sub={e.sub} action={e.action} selected={e.selected} />
              ) : (
                <Slot key={e.key} accent={e.accent} plate={e.art} title={e.title} desc={e.sub ?? ''} meta={e.meta} action={e.action} selected={e.selected} />
              ),
            )}
          </View>
        </View>
      ))}
    </View>
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

function skinEntry(s: Skin, { profile, updateProfile, apply, big }: Ctx): Entry {
  const owned = profile.ownedSkins.includes(s.id);
  const selected = profile.selectedSkinId === s.id;
  return {
    key: s.id,
    accent: RARITY_COLORS[s.rarity],
    tag: RARITY_LABEL[s.rarity],
    selected,
    art: <Character skin={s} size={big ? 64 : 40} />,
    title: s.name,
    sub: s.power ? SKIN_POWERS[s.power].description : undefined,
    action: owned ? (
      <Button small title={selected ? 'Selected' : 'Select'} variant={selected ? 'dark' : 'primary'} disabled={selected} onPress={() => updateProfile((p) => ({ ...p, selectedSkinId: s.id }))} />
    ) : s.rarity === 'exclusive' ? (
      <Button small title="Tournament prize" variant="dark" lead={<Icon name="trophy-outline" size={14} color={colors.gold} />} disabled />
    ) : s.medalPrice ? (
      <PriceButton price={s.medalPrice} medals onPress={() => apply(buySkinWithMedals(profile, s.id), `The ${s.name} skin is yours!`)} />
    ) : (
      <PriceButton price={s.price} onPress={() => apply(buySkin(profile, s.id), `The ${s.name} skin is yours!`)} />
    ),
  };
}

function SkinsTab({ apply }: { apply: Apply }) {
  const ctx = useCtx(apply);
  const { isDesktop } = useDevice();
  const { profile } = ctx;
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
    <View style={styles.tabBody}>
      {isDesktop && featured && show === 'all' ? <FeaturedSkin s={featured} apply={apply} /> : null}
      <Shelf
        toolbar={<ShowFilter value={show} onChange={setShow} />}
        groups={[{ title: 'Skins', color: colors.gold, kind: 'show', count: `${owned}/${BUILT_IN_SKINS.length}`, entries: list.map((s) => skinEntry(s, ctx)) }]}
      />
    </View>
  );
}

function FeaturedSkin({ s, apply }: { s: Skin; apply: Apply }) {
  const profile = useProfile();
  return (
    <View style={styles.featured}>
      <View style={[styles.featuredStage, { backgroundColor: colors.medal + '33' }]}>
        <View style={[styles.stageGlow, { width: 170, height: 170, borderRadius: 85, backgroundColor: colors.medal + '45' }]} />
        <Character skin={s} size={96} />
      </View>
      <View style={styles.featuredInfo}>
        <View style={styles.featuredKicker}>
          <Icon name="star-four-points" size={14} color={colors.medal} />
          <Text style={styles.featuredKickerText}>Featured medal skin</Text>
        </View>
        <Text style={styles.featuredName}>{s.name}</Text>
        {s.power ? <Text style={styles.featuredPower}>{SKIN_POWERS[s.power].description}</Text> : null}
        <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
          <PriceButton price={s.medalPrice!} medals onPress={() => apply(buySkinWithMedals(profile, s.id), `The ${s.name} skin is yours!`)} />
        </View>
      </View>
    </View>
  );
}

// ---------- Outfits ----------

function outfitEntry(o: Outfit, { profile, updateProfile, apply, big }: Ctx): Entry {
  const owned = profile.ownedOutfits.includes(o.id);
  const equipped = profile.equippedOutfit === o.id;
  return {
    key: o.id,
    accent: o.medalPrice ? colors.medal : colors.blue,
    tag: o.medalPrice ? 'Medals' : undefined,
    selected: equipped,
    art: <Character skin={findSkin(profile.selectedSkinId, profile.customSkins)} size={big ? 60 : 40} outfit={o.emoji} />,
    title: o.name,
    action: owned ? (
      <Button small title={equipped ? 'Remove' : 'Wear'} variant={equipped ? 'dark' : 'primary'} onPress={() => updateProfile((p) => ({ ...p, equippedOutfit: equipped ? null : o.id }))} />
    ) : (
      <PriceButton
        price={o.medalPrice ?? o.price}
        medals={!!o.medalPrice}
        needLevel={o.medalPrice ? undefined : o.minLevel}
        onPress={() => apply(buyOutfit(profile, o.id), `Bought ${o.name}`, o.emoji)}
      />
    ),
  };
}

function OutfitsTab({ apply }: { apply: Apply }) {
  const ctx = useCtx(apply);
  const { profile } = ctx;
  const [show, setShow] = useState<Show>('all');
  const list = OUTFITS.filter((o) => {
    if (show === 'owned') return profile.ownedOutfits.includes(o.id);
    if (show === 'medals') return !!o.medalPrice;
    if (show === 'coins') return !o.medalPrice;
    return true;
  }).sort((a, b) => (a.medalPrice ? 1 : 0) - (b.medalPrice ? 1 : 0) || a.minLevel - b.minLevel || a.price - b.price);
  return (
    <View style={styles.tabBody}>
      <Shelf
        toolbar={<ShowFilter value={show} onChange={setShow} />}
        groups={[{ title: 'Outfits', color: colors.gold, kind: 'show', count: `${profile.ownedOutfits.length}/${OUTFITS.length}`, entries: list.map((o) => outfitEntry(o, ctx)) }]}
      />
    </View>
  );
}

// ---------- Abilities ----------

function abilityEntry(a: AbilityDef, role: Role, color: string, { profile, apply, big }: Ctx): Entry {
  const owned = profile.ownedAbilities.includes(a.id);
  const equipped = profile.loadout[role].includes(a.id);
  const price = ABILITY_PRICES[a.id as AbilityId];
  return {
    key: a.id,
    accent: color,
    tag: role === 'survivor' ? 'Survivor' : 'Zombie',
    selected: equipped,
    art: <Glyph emoji={a.icon} size={big ? 26 : 22} color={colors.ink} />,
    title: a.name,
    sub: a.description,
    meta: (
      <View style={styles.meta}>
        <Icon name="timer-sand" size={13} color={colors.textMuted} />
        <Text style={styles.metaText}>{a.cooldownSec}s</Text>
      </View>
    ),
    action: owned ? (
      <Button
        small
        title={equipped ? 'Equipped' : 'Equip'}
        lead={equipped ? <Icon name="check-bold" size={14} color={colors.text} /> : undefined}
        variant={equipped ? 'dark' : 'primary'}
        onPress={() => apply(toggleLoadout(profile, role, a.id), equipped ? `${a.name} removed` : `${a.name} equipped`, a.icon)}
      />
    ) : price ? (
      <PriceButton price={price.price} needLevel={price.minLevel} onPress={() => apply(buyAbility(profile, a.id), `${a.name} unlocked!`, a.icon)} />
    ) : null,
  };
}

function AbilitiesTab({ apply }: { apply: Apply }) {
  const ctx = useCtx(apply);
  const { isDesktop } = useDevice();
  const { profile } = ctx;
  const roles: { role: Role; title: string; color: string }[] = [
    { role: 'survivor', title: 'Survivor abilities', color: colors.survivor },
    { role: 'zombie', title: 'Zombie abilities', color: colors.zombie },
  ];
  const groups: Group[] = roles.map(({ role, title, color }) => ({
    title,
    color,
    kind: 'slot',
    count: `${profile.loadout[role].length}/${MAX_LOADOUT}`,
    entries: Object.values(ABILITIES)
      .filter((a) => a.role === role)
      .sort((a, b) => (ABILITY_PRICES[a.id]?.minLevel ?? 0) - (ABILITY_PRICES[b.id]?.minLevel ?? 0))
      .map((a) => abilityEntry(a, role, color, ctx)),
  }));
  return (
    <View style={styles.tabBody}>
      <Shelf
        toolbar={isDesktop ? <P dim>Pick up to {MAX_LOADOUT} abilities per role. They show up as buttons in the match, and the smart ability helper highlights when each one is worth using.</P> : undefined}
        groups={groups}
      />
    </View>
  );
}

// ---------- Upgrades ----------

function upgradeEntry(id: UpgradeId, color: string, { profile, apply, big }: Ctx): Entry {
  const u = UPGRADES.find((x) => x.id === id)!;
  const cur = profile.upgrades[u.id] ?? 0;
  const max = cur >= u.maxLevel;
  return {
    key: u.id,
    accent: color,
    art: <Icon name={UPGRADE_ICON[u.id]} size={big ? 24 : 20} color={colors.ink} />,
    title: u.name,
    sub: u.description,
    meta: (
      <View style={styles.pips}>
        {Array.from({ length: u.maxLevel }, (_, i) => (
          <View key={i} style={[styles.pip, i < cur && { backgroundColor: color }]} />
        ))}
      </View>
    ),
    action: max ? (
      <Tag text="Max" color={colors.toxic} tilt={3} />
    ) : (
      <PriceButton price={upgradePrice(u, cur)} needLevel={upgradeMinLevel(cur)} onPress={() => apply(buyUpgrade(profile, u.id), `${u.name} upgraded to level ${cur + 1}`, u.icon)} />
    ),
  };
}

function UpgradesTab({ apply }: { apply: Apply }) {
  const ctx = useCtx(apply);
  const groups: Group[] = UPGRADE_GROUPS.map((g) => ({ title: g.title, color: g.color, kind: 'slot', entries: g.ids.map((id) => upgradeEntry(id, g.color, ctx)) }));
  return (
    <View style={styles.tabBody}>
      <Shelf groups={groups} />
    </View>
  );
}

// ---------- Filters ----------

function filterEntry(f: ZombieFilter, { profile, updateProfile, apply }: Ctx): Entry {
  const owned = profile.ownedFilters.includes(f.id);
  const equipped = profile.equippedFilter === f.id;
  return {
    key: f.id,
    accent: f.medalPrice ? colors.medal : colors.zombie,
    tag: f.medalPrice ? 'Medals' : undefined,
    selected: equipped,
    art: (
      <View style={[styles.filterSwatch, { backgroundColor: f.vignette }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: f.color, opacity: f.opacity * 3 }]} />
        <Icon name="virus-outline" size={22} color={colors.toxic} />
      </View>
    ),
    title: f.name,
    sub: f.description,
    meta: Object.keys(f.bonus).length ? (
      <View style={styles.meta}>
        <Icon name="arrow-up-bold" size={13} color={colors.toxic} />
        <Text style={styles.perk} numberOfLines={1}>
          {f.perk}
        </Text>
      </View>
    ) : undefined,
    action: owned ? (
      <Button small title={equipped ? 'Active' : 'Use'} variant={equipped ? 'dark' : 'primary'} disabled={equipped} onPress={() => updateProfile((p) => ({ ...p, equippedFilter: f.id }))} />
    ) : (
      <PriceButton price={f.medalPrice ?? f.price} medals={!!f.medalPrice} onPress={() => apply(buyFilter(profile, f.id), `Bought the ${f.name} filter`)} />
    ),
  };
}

function FiltersTab({ apply }: { apply: Apply }) {
  const ctx = useCtx(apply);
  const { isDesktop } = useDevice();
  const { profile } = ctx;
  const list = [...ZOMBIE_FILTERS].sort((a, b) => (a.medalPrice ? 1 : 0) - (b.medalPrice ? 1 : 0) || a.price - b.price);
  return (
    <View style={styles.tabBody}>
      <Shelf
        toolbar={isDesktop ? <P dim>A filter tints your screen while you are a zombie, and each filter gives your zombie a bonus in the match.</P> : undefined}
        groups={[{ title: 'Zombie filters', color: colors.zombie, kind: 'slot', count: `${profile.ownedFilters.length}/${ZOMBIE_FILTERS.length}`, entries: list.map((f) => filterEntry(f, ctx)) }]}
      />
    </View>
  );
}

// ---------- Medal shop ----------

/** Phone only: the medal exchange as one tile. Desktop shows the full exchange block instead. */
function exchangeEntry({ profile, apply }: Ctx): Entry {
  return {
    key: 'exchange',
    accent: colors.gold,
    art: <Icon name="swap-horizontal-bold" size={24} color={colors.ink} />,
    title: 'Medal exchange',
    sub: `Each medal is worth ${MEDAL_TO_COINS} coins.`,
    action: (
      <View style={styles.convert}>
        <Button small variant="dark" title={`1 → ${MEDAL_TO_COINS}`} lead={<Coin size={12} />} disabled={profile.medals < 1} onPress={() => apply(convertMedals(profile, 1), `You got ${MEDAL_TO_COINS} coins`)} />
        <Button small variant="gold" title="All" disabled={profile.medals < 1} onPress={() => apply(convertMedals(profile, profile.medals), `You got ${profile.medals * MEDAL_TO_COINS} coins`)} />
      </View>
    ),
  };
}

function MedalShopTab({ apply }: { apply: Apply }) {
  const ctx = useCtx(apply);
  const { isDesktop } = useDevice();
  const { profile } = ctx;
  const skins = BUILT_IN_SKINS.filter((s) => s.medalPrice).sort((a, b) => a.medalPrice! - b.medalPrice!);
  const outfits = OUTFITS.filter((o) => o.medalPrice).sort((a, b) => a.medalPrice! - b.medalPrice!);
  const filters = ZOMBIE_FILTERS.filter((f) => f.medalPrice);
  const groups: Group[] = [
    { title: 'Medal skins', color: colors.medal, kind: 'show', entries: skins.map((s) => skinEntry(s, ctx)) },
    { title: 'Medal outfits', color: colors.medal, kind: 'show', entries: outfits.map((o) => outfitEntry(o, ctx)) },
    { title: 'Medal filters', color: colors.medal, kind: 'slot', entries: filters.map((f) => filterEntry(f, ctx)) },
  ];
  if (!isDesktop) groups.push({ title: 'Swap medals for coins', color: colors.gold, kind: 'show', entries: [exchangeEntry(ctx)] });
  return (
    <View style={styles.tabBody}>
      {isDesktop ? (
        <>
          <View style={styles.medalHero}>
            <View style={styles.medalDisc}>
              <Icon name="medal" size={40} color={colors.medal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.medalCount}>{profile.medals}</Text>
              <Text style={styles.medalHint}>Earn medals in tournaments and obstacle runs. Spend them on items you cannot buy with coins.</Text>
            </View>
          </View>
          <Shelf groups={groups} />
          <SectionTitle text="Swap medals for coins" color={colors.gold} />
          <View style={styles.exchange}>
            <View style={styles.slotHead}>
              <View style={[styles.slotPlate, { backgroundColor: colors.gold }]}>
                <Icon name="swap-horizontal-bold" size={26} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.slotTitle}>Medal exchange</Text>
                <Text style={styles.slotDesc}>Each medal is worth {MEDAL_TO_COINS} coins.</Text>
              </View>
            </View>
            <View style={styles.convert}>
              {[1, 5, 10].map((n) => (
                <Button
                  key={n}
                  small
                  variant="dark"
                  title={`${n} → ${n * MEDAL_TO_COINS}`}
                  lead={<Coin size={12} />}
                  disabled={profile.medals < n}
                  onPress={() => apply(convertMedals(profile, n), `You got ${n * MEDAL_TO_COINS} coins`)}
                />
              ))}
              <Button small variant="gold" title="Convert all" disabled={profile.medals < 1} onPress={() => apply(convertMedals(profile, profile.medals), `You got ${profile.medals * MEDAL_TO_COINS} coins`)} />
            </View>
          </View>
        </>
      ) : (
        <Shelf groups={groups} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, marginTop: 12 },
  tabBody: { flex: 1, gap: 12 },
  deskRow: { flex: 1, flexDirection: 'row', gap: 24, alignItems: 'stretch' },
  rail: { width: 220, gap: 6, backgroundColor: colors.panel, borderRadius: radius.lg, padding: 10 },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingHorizontal: 14, borderRadius: radius.md },
  railItemOn: { backgroundColor: colors.toxic },
  railText: { color: colors.textDim, fontWeight: '800', fontSize: 15 },
  locker: { marginTop: 'auto', borderRadius: radius.md, backgroundColor: colors.bgAlt, padding: 12, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  lockerArt: { width: 124, height: 124, borderRadius: 62, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  lockerLevel: { color: colors.text, fontWeight: '900', fontSize: 16 },
  lockerBal: { flexDirection: 'row', gap: 8 },
  lockerChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.panel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  lockerNum: { color: colors.text, fontWeight: '900', fontSize: 14 },
  show: { flexGrow: 1, flexBasis: 168, minWidth: 168, backgroundColor: colors.panel, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 2, borderBottomWidth: 5, borderColor: 'rgba(255,255,255,0.08)' },
  stage: { height: 104, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stageGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  ribbon: { position: 'absolute', top: 8, left: 0, paddingHorizontal: 9, paddingVertical: 2, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  ribbonText: { color: colors.ink, fontWeight: '900', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  tick: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.toxic, alignItems: 'center', justifyContent: 'center' },
  showBody: { padding: 10, gap: 5, alignItems: 'center' },
  slot: { flexGrow: 1, flexBasis: '47%', minWidth: 280, backgroundColor: colors.panel, borderRadius: radius.lg, padding: 12, gap: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: 'rgba(255,255,255,0.08)' },
  slotHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  slotPlate: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotTitle: { color: colors.text, fontWeight: '900', fontSize: 15, textAlign: 'left' },
  slotDesc: { color: colors.textDim, fontSize: 12, textAlign: 'left', marginTop: 2 },
  slotFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exchange: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: 12, gap: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: 'rgba(255,255,255,0.08)' },
  mini: { flex: 1, flexDirection: 'row', backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 2, borderBottomWidth: 4, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  miniArt: { width: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  miniTag: { position: 'absolute', top: 4, left: 0, color: colors.ink, fontSize: 8, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 5, paddingVertical: 1, borderTopRightRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden' },
  miniBody: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'space-between' },
  miniName: { color: colors.text, fontWeight: '900', fontSize: 13, textAlign: 'left' },
  miniSub: { color: colors.textDim, fontSize: 11, textAlign: 'left' },
  miniAction: { alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemName: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  power: { color: colors.textDim, fontSize: 11, textAlign: 'center', minHeight: 28 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  pips: { flexDirection: 'row', gap: 4, marginTop: 3 },
  pip: { flex: 1, maxWidth: 28, height: 8, borderRadius: 3, backgroundColor: colors.bgAlt, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  filterSwatch: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  perk: { color: colors.toxic, fontWeight: '700', fontSize: 12, flexShrink: 1 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionBar: { width: 6, height: 18, borderRadius: 2, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  sectionText: { color: colors.text, fontSize: 17, fontWeight: '900', flex: 1, textAlign: 'left' },
  sectionCount: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  featured: { flexDirection: 'row', borderRadius: 16, borderWidth: 2, borderBottomWidth: 6, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: colors.panel, overflow: 'hidden' },
  featuredStage: { width: 170, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingVertical: 16 },
  featuredInfo: { flex: 1, padding: 16, gap: 4, justifyContent: 'center' },
  featuredKicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredKickerText: { color: colors.medal, fontWeight: '900', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  featuredName: { color: colors.text, fontSize: 26, fontWeight: '900', textAlign: 'left', fontFamily: fonts.logo },
  featuredPower: { color: colors.textDim, fontSize: 13, textAlign: 'left' },
  medalDisc: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  medalHero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.medal, borderRadius: 16, padding: 16, borderWidth: 2, borderBottomWidth: 6, borderColor: 'rgba(255,255,255,0.12)' },
  medalCount: { color: colors.ink, fontSize: 34, fontWeight: '900', textAlign: 'left' },
  medalHint: { color: colors.ink, fontSize: 13, fontWeight: '500', textAlign: 'left', opacity: 0.8 },
  convert: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
