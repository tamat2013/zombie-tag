// Choose the skin (and outfit) to play with. Part of the play flow when `flow` is set.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScreenProps } from '../navigation/types';
import type { Skin } from '../types';
import { Screen, ScreenHeader, Card, H, P } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { BUILT_IN_SKINS, RARITY_COLORS, SKIN_POWERS, findSkin } from '../data/skins';
import { OUTFITS, outfitEmoji } from '../data/catalog';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

const MODE_NAMES = { classic: 'Classic', tournament: 'Tournament', obstacle: 'Obstacle Course', training: 'Training' } as const;

export function SkinSelectScreen({ navigation, route }: ScreenProps<'SkinSelect'>) {
  const flow = route.params?.flow;
  const profile = useProfile();
  const { updateProfile } = useGame();
  const selected = findSkin(profile.selectedSkinId, profile.customSkins);
  const owned: Skin[] = [...profile.customSkins, ...BUILT_IN_SKINS.filter((s) => profile.ownedSkins.includes(s.id))];
  const lockedCount = BUILT_IN_SKINS.length - BUILT_IN_SKINS.filter((s) => profile.ownedSkins.includes(s.id)).length;

  const pick = (s: Skin) => {
    haptic('light');
    updateProfile((p) => ({ ...p, selectedSkinId: s.id }));
  };

  return (
    <Screen scroll>
      <ScreenHeader title={flow ? `Choose skin · ${MODE_NAMES[flow.mode]}` : 'My skins'} />

      <Card style={styles.preview}>
        <Character skin={selected} size={110} outfit={outfitEmoji(profile.equippedOutfit)} />
        <View style={{ flex: 1 }}>
          <H>{selected.name}</H>
          <Text style={[styles.rarity, { color: RARITY_COLORS[selected.rarity] }]}>{selected.custom ? 'Custom design' : selected.rarity.toUpperCase()}</Text>
          {selected.power ? (
            <P dim>
              ⚡ {SKIN_POWERS[selected.power].name}: {SKIN_POWERS[selected.power].description}
            </P>
          ) : (
            <P dim>No special power</P>
          )}
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <Character skin={selected} size={44} role="zombie" />
            <P dim style={{ marginRight: 8, alignSelf: 'center' }}>
              This is how you look as a zombie
            </P>
          </View>
        </View>
      </Card>

      <H size={17} style={styles.section}>
        Skins ({owned.length})
      </H>
      <View style={styles.grid}>
        {owned.map((s) => (
          <Pressable key={s.id} onPress={() => pick(s)} style={[styles.skin, s.id === selected.id && { borderColor: colors.toxic, borderWidth: 3 }]}>
            <Character skin={s} size={54} />
            <Text style={styles.skinName} numberOfLines={1}>
              {s.name}
            </Text>
            <View style={[styles.rarityDot, { backgroundColor: s.custom ? colors.purple : RARITY_COLORS[s.rarity] }]} />
            {s.custom ? (
              <Pressable hitSlop={8} onPress={() => navigation.navigate('SkinDesigner', { skinId: s.id })} style={styles.edit}>
                <Text style={{ fontSize: 12 }}>✏️</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
        <Pressable onPress={() => navigation.navigate('SkinDesigner')} style={[styles.skin, styles.add]}>
          <Text style={{ fontSize: 30 }}>➕</Text>
          <Text style={styles.skinName}>Design skin</Text>
        </Pressable>
        {lockedCount > 0 ? (
          <Pressable onPress={() => navigation.navigate('Shop', { tab: 'skins' })} style={[styles.skin, styles.add]}>
            <Text style={{ fontSize: 30 }}>🔒</Text>
            <Text style={styles.skinName}>{lockedCount} in shop</Text>
          </Pressable>
        ) : null}
      </View>

      <H size={17} style={styles.section}>
        Outfit
      </H>
      <View style={styles.outfits}>
        <OutfitChip label="None" emoji="🚫" active={!profile.equippedOutfit} onPress={() => updateProfile((p) => ({ ...p, equippedOutfit: null }))} />
        {OUTFITS.filter((o) => profile.ownedOutfits.includes(o.id)).map((o) => (
          <OutfitChip key={o.id} label={o.name} emoji={o.emoji} active={profile.equippedOutfit === o.id} onPress={() => updateProfile((p) => ({ ...p, equippedOutfit: o.id }))} />
        ))}
        <OutfitChip label="More in shop" emoji="🛒" onPress={() => navigation.navigate('Shop', { tab: 'outfits' })} />
      </View>

      {flow ? (
        <Button
          title="Continue to map select"
          icon="🗺️"
          style={{ marginTop: 22 }}
          onPress={() => navigation.navigate('MapSelect', { flow })}
        />
      ) : null}
    </Screen>
  );
}

function OutfitChip({ label, emoji, active, onPress }: { label: string; emoji: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.outfit, active && { borderColor: colors.toxic, backgroundColor: '#1f3a17' }]}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={styles.outfitLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  rarity: { fontWeight: '900', fontSize: 12, textAlign: 'left', marginBottom: 4 },
  section: { marginTop: 18, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skin: { width: 92, height: 106, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
  skinName: { color: colors.text, fontSize: 12, fontWeight: '800', maxWidth: 84, textAlign: 'center' },
  rarityDot: { position: 'absolute', top: 7, left: 7, width: 8, height: 8, borderRadius: 4 },
  edit: { position: 'absolute', top: 4, right: 4 },
  add: { borderStyle: 'dashed' },
  outfits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outfit: { width: 78, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, alignItems: 'center', gap: 4 },
  outfitLabel: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
