// Shop: skins, outfits, abilities, upgrades, zombie filters and medal exchange.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ScreenProps, ShopTab } from '../navigation/types';
import type { AbilityId, Role } from '../types';
import { Screen, ScreenHeader, Card, H, P, Tabs, ProgressBar } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { BUILT_IN_SKINS, RARITY_COLORS, SKIN_POWERS, findSkin } from '../data/skins';
import { ABILITY_PRICES, MEDAL_TO_COINS, OUTFITS, UPGRADES, ZOMBIE_FILTERS, upgradeMinLevel, upgradePrice } from '../data/catalog';
import { ABILITIES, MAX_LOADOUT } from '../engine/abilities';
import { buyAbility, buyFilter, buyOutfit, buySkin, buyUpgrade, convertMedals, toggleLoadout } from '../logic/shop';
import type { ShopResult } from '../logic/shop';
import { levelInfo } from '../logic/progression';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

const TABS: { id: ShopTab; label: string }[] = [
  { id: 'skins', label: '🎨 סקינים' },
  { id: 'outfits', label: '🎩 תלבושות' },
  { id: 'abilities', label: '⚡ יכולות' },
  { id: 'upgrades', label: '⬆️ שדרוגים' },
  { id: 'filters', label: '🧟 מסנני זומבי' },
  { id: 'coins', label: '🏅 מדליות' },
];

export function ShopScreen({ route }: ScreenProps<'Shop'>) {
  const [tab, setTab] = useState<ShopTab>(route.params?.tab ?? 'skins');
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const level = levelInfo(profile.xp).level;

  const apply = (r: ShopResult, success: string, icon = '🛒') => {
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
      <ScreenHeader title="חנות" />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <View style={{ marginTop: 12 }}>
        {tab === 'skins' ? <SkinsTab apply={apply} /> : null}
        {tab === 'outfits' ? (
          <View style={styles.grid}>
            {OUTFITS.map((o) => {
              const owned = profile.ownedOutfits.includes(o.id);
              const equipped = profile.equippedOutfit === o.id;
              const locked = level < o.minLevel;
              return (
                <Card key={o.id} style={styles.item} highlight={equipped ? colors.toxic : undefined}>
                  <Character skin={findSkin(profile.selectedSkinId, profile.customSkins)} size={56} outfit={o.emoji} />
                  <Text style={styles.itemName}>{o.name}</Text>
                  {owned ? (
                    <Button
                      small
                      title={equipped ? 'הסר' : 'לבש'}
                      variant={equipped ? 'dark' : 'primary'}
                      onPress={() => updateProfile((p) => ({ ...p, equippedOutfit: equipped ? null : o.id }))}
                    />
                  ) : (
                    <Button small variant="gold" title={locked ? `רמה ${o.minLevel}` : `${o.price} 🪙`} disabled={locked} onPress={() => apply(buyOutfit(profile, o.id), `קנית ${o.name}`, o.emoji)} />
                  )}
                </Card>
              );
            })}
          </View>
        ) : null}
        {tab === 'abilities' ? <AbilitiesTab apply={apply} /> : null}
        {tab === 'upgrades' ? (
          <View style={{ gap: 10 }}>
            {UPGRADES.map((u) => {
              const cur = profile.upgrades[u.id] ?? 0;
              const max = cur >= u.maxLevel;
              const need = upgradeMinLevel(cur);
              return (
                <Card key={u.id} style={styles.row}>
                  <Text style={{ fontSize: 34 }}>{u.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <H size={15}>
                      {u.name} · {cur}/{u.maxLevel}
                    </H>
                    <P dim>{u.description}</P>
                    <ProgressBar value={cur / u.maxLevel} color={colors.gold} height={7} style={{ marginTop: 4 }} />
                  </View>
                  <Button
                    small
                    variant="gold"
                    title={max ? 'מקסימום' : level < need ? `רמה ${need}` : `${upgradePrice(u, cur)} 🪙`}
                    disabled={max || level < need}
                    onPress={() => apply(buyUpgrade(profile, u.id), `${u.name} שודרג לרמה ${cur + 1}`, u.icon)}
                  />
                </Card>
              );
            })}
          </View>
        ) : null}
        {tab === 'filters' ? (
          <View style={{ gap: 10 }}>
            <P dim>המסנן צובע את המסך כשאתה זומבי.</P>
            {ZOMBIE_FILTERS.map((f) => {
              const owned = profile.ownedFilters.includes(f.id);
              const equipped = profile.equippedFilter === f.id;
              return (
                <Card key={f.id} style={styles.row} highlight={equipped ? colors.toxic : undefined}>
                  <View style={[styles.filterSwatch, { backgroundColor: f.vignette }]}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: f.color, opacity: f.opacity * 3, borderRadius: 10 }]} />
                    <Text style={{ fontSize: 22 }}>🧟</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <H size={15}>{f.name}</H>
                    <P dim>{f.description}</P>
                  </View>
                  {owned ? (
                    <Button small title={equipped ? 'פעיל' : 'הפעל'} variant={equipped ? 'dark' : 'primary'} disabled={equipped} onPress={() => updateProfile((p) => ({ ...p, equippedFilter: f.id }))} />
                  ) : (
                    <Button small variant="gold" title={`${f.price} 🪙`} onPress={() => apply(buyFilter(profile, f.id), `המסנן ${f.name} נקנה`, '🧟')} />
                  )}
                </Card>
              );
            })}
          </View>
        ) : null}
        {tab === 'coins' ? <CoinsTab apply={apply} /> : null}
      </View>
    </Screen>
  );
}

type Apply = (r: ShopResult, success: string, icon?: string) => void;

function SkinsTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  const { updateProfile } = useGame();
  return (
    <View style={styles.grid}>
      {BUILT_IN_SKINS.map((s) => {
        const owned = profile.ownedSkins.includes(s.id);
        const selected = profile.selectedSkinId === s.id;
        return (
          <Card key={s.id} style={styles.item} highlight={selected ? colors.toxic : undefined}>
            <View style={[styles.rarity, { backgroundColor: RARITY_COLORS[s.rarity] }]} />
            <Character skin={s} size={60} />
            <Text style={styles.itemName}>{s.name}</Text>
            <Text style={styles.power} numberOfLines={2}>
              {s.power ? `⚡ ${SKIN_POWERS[s.power].description}` : ' '}
            </Text>
            {owned ? (
              <Button small title={selected ? 'נבחר' : 'בחר'} variant={selected ? 'dark' : 'primary'} disabled={selected} onPress={() => updateProfile((p) => ({ ...p, selectedSkinId: s.id }))} />
            ) : s.rarity === 'exclusive' ? (
              <Button small title="🏆 פרס טורניר" variant="dark" disabled />
            ) : (
              <Button small variant="gold" title={`${s.price} 🪙`} onPress={() => apply(buySkin(profile, s.id), `הסקין ${s.name} שלך!`, '🎨')} />
            )}
          </Card>
        );
      })}
    </View>
  );
}

function AbilitiesTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  const level = levelInfo(profile.xp).level;
  const roles: { role: Role; title: string }[] = [
    { role: 'survivor', title: '🧍 יכולות שורד' },
    { role: 'zombie', title: '🧟 יכולות זומבי' },
  ];
  return (
    <View style={{ gap: 14 }}>
      <P dim>בחר עד {MAX_LOADOUT} יכולות לכל תפקיד. הן יופיעו ככפתורים במשחק, ומנהל היכולות החכם יסמן מתי כדאי להשתמש בכל אחת.</P>
      {roles.map(({ role, title }) => (
        <View key={role} style={{ gap: 8 }}>
          <H size={16}>
            {title} ({profile.loadout[role].length}/{MAX_LOADOUT})
          </H>
          {Object.values(ABILITIES)
            .filter((a) => a.role === role)
            .map((a) => {
              const owned = profile.ownedAbilities.includes(a.id);
              const equipped = profile.loadout[role].includes(a.id);
              const price = ABILITY_PRICES[a.id as AbilityId];
              return (
                <Card key={a.id} style={styles.row} highlight={equipped ? colors.toxic : undefined}>
                  <Text style={{ fontSize: 32 }}>{a.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <H size={15}>{a.name}</H>
                    <P dim>{a.description}</P>
                    <P dim style={{ fontSize: 12 }}>טעינה: {a.cooldownSec} שנ׳</P>
                  </View>
                  {owned ? (
                    <Button
                      small
                      title={equipped ? 'מצויד ✔' : 'צייד'}
                      variant={equipped ? 'dark' : 'primary'}
                      onPress={() => apply(toggleLoadout(profile, role, a.id), equipped ? `${a.name} הוסרה` : `${a.name} צוידה`, a.icon)}
                    />
                  ) : price ? (
                    <Button
                      small
                      variant="gold"
                      title={level < price.minLevel ? `רמה ${price.minLevel}` : `${price.price} 🪙`}
                      disabled={level < price.minLevel}
                      onPress={() => apply(buyAbility(profile, a.id), `היכולת ${a.name} נפתחה!`, a.icon)}
                    />
                  ) : null}
                </Card>
              );
            })}
        </View>
      ))}
    </View>
  );
}

function CoinsTab({ apply }: { apply: Apply }) {
  const profile = useProfile();
  return (
    <View style={{ gap: 12 }}>
      <Card highlight={colors.medal}>
        <H size={16}>🏅 המרת מדליות</H>
        <P dim>
          כל מדליה שווה {MEDAL_TO_COINS} מטבעות. יש לך {profile.medals} מדליות.
        </P>
        <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {[1, 5, 10].map((n) => (
            <Button key={n} small variant="dark" title={`${n} ← ${n * MEDAL_TO_COINS} 🪙`} disabled={profile.medals < n} onPress={() => apply(convertMedals(profile, n), `קיבלת ${n * MEDAL_TO_COINS} מטבעות`, '🪙')} />
          ))}
          <Button small variant="gold" title="המר הכל" disabled={profile.medals < 1} onPress={() => apply(convertMedals(profile, profile.medals), `קיבלת ${profile.medals * MEDAL_TO_COINS} מטבעות`, '🪙')} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  item: { width: 150, alignItems: 'center', gap: 6, paddingVertical: 14 },
  itemName: { color: colors.text, fontWeight: '900', fontSize: 14, textAlign: 'center' },
  power: { color: colors.textDim, fontSize: 11, textAlign: 'center', minHeight: 28 },
  rarity: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  filterSwatch: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bonus: { color: colors.toxic, fontWeight: '800', fontSize: 12 },
  best: { position: 'absolute', top: -1, left: -1, right: -1, backgroundColor: colors.gold, color: '#1a1200', fontWeight: '900', fontSize: 11, textAlign: 'center', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, paddingVertical: 2 },
});
