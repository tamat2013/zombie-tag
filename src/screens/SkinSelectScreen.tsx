// Choose the skin (and outfit) to play with. Part of the play flow when `flow` is set. The phone keeps the preview on the left and pages through the skins on the right.
import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { Skin } from '../types';
import { Card, Grid, H, P, Screen, ScreenHeader } from '../components/ui';
import { Glyph, Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { BUILT_IN_SKINS, RARITY_COLORS, SKIN_POWERS, findSkin } from '../data/skins';
import { OUTFITS, outfitEmoji } from '../data/catalog';
import type { IconName } from '../components/Icon';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';
import { useDevice } from '../utils/device';

const MODE_NAMES = { classic: 'Classic', tournament: 'Tournament', obstacle: 'Obstacle Course', training: 'Training' } as const;

type Tile = { id: string; skin?: Skin; kind?: 'design' | 'shop' };

export function SkinSelectScreen({ navigation, route }: ScreenProps<'SkinSelect'>) {
  const flow = route.params?.flow;
  const { isDesktop } = useDevice();
  const profile = useProfile();
  const { updateProfile } = useGame();
  const selected = findSkin(profile.selectedSkinId, profile.customSkins);
  const owned: Skin[] = [...profile.customSkins, ...BUILT_IN_SKINS.filter((s) => profile.ownedSkins.includes(s.id))];
  const lockedCount = BUILT_IN_SKINS.length - BUILT_IN_SKINS.filter((s) => profile.ownedSkins.includes(s.id)).length;

  const pick = (s: Skin) => {
    haptic('light');
    updateProfile((p) => ({ ...p, selectedSkinId: s.id }));
  };

  const tiles: Tile[] = [
    ...owned.map((s) => ({ id: s.id, skin: s })),
    { id: 'design', kind: 'design' },
    ...(lockedCount > 0 ? [{ id: 'shop', kind: 'shop' as const }] : []),
  ];

  const preview = (
    <Card style={[styles.preview, !isDesktop && styles.previewPhone]}>
      <Character skin={selected} size={isDesktop ? 110 : 64} outfit={outfitEmoji(profile.equippedOutfit)} />
      <View style={{ flex: 1 }}>
        <H size={isDesktop ? 22 : 16}>{selected.name}</H>
        <Text style={[styles.rarity, { color: RARITY_COLORS[selected.rarity] }]}>{selected.custom ? 'Custom design' : selected.rarity.toUpperCase()}</Text>
        {selected.power ? (
          <P dim style={!isDesktop && styles.small}>
            {SKIN_POWERS[selected.power].name}: {SKIN_POWERS[selected.power].description}
          </P>
        ) : (
          <P dim style={!isDesktop && styles.small}>
            No special power
          </P>
        )}
        {isDesktop ? (
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <Character skin={selected} size={44} role="zombie" />
            <P dim style={{ marginRight: 8, alignSelf: 'center' }}>
              This is how you look as a zombie
            </P>
          </View>
        ) : null}
      </View>
    </Card>
  );

  const renderTile = (t: Tile) => {
    if (t.skin) {
      const s = t.skin;
      return (
        <Pressable onPress={() => pick(s)} style={[styles.skin, s.id === selected.id && styles.skinOn]}>
          <Character skin={s} size={isDesktop ? 54 : 40} />
          <Text style={[styles.skinName, !isDesktop && styles.skinNamePhone]} numberOfLines={1}>
            {s.name}
          </Text>
          <View style={[styles.rarityDot, { backgroundColor: s.custom ? colors.purple : RARITY_COLORS[s.rarity] }]} />
          {s.custom ? (
            <Pressable hitSlop={8} onPress={() => navigation.navigate('SkinDesigner', { skinId: s.id })} style={styles.edit}>
              <Icon name="pencil" size={13} color={colors.text} />
            </Pressable>
          ) : null}
        </Pressable>
      );
    }
    if (t.kind === 'design') {
      return (
        <Pressable onPress={() => navigation.navigate('SkinDesigner')} style={[styles.skin, styles.add]}>
          <Icon name="plus" size={isDesktop ? 32 : 24} color={colors.textDim} />
          <Text style={styles.skinName}>Design skin</Text>
        </Pressable>
      );
    }
    return (
      <Pressable onPress={() => navigation.navigate('Shop', { tab: 'skins' })} style={[styles.skin, styles.add]}>
        <Icon name="lock" size={isDesktop ? 30 : 22} color={colors.textMuted} />
        <Text style={styles.skinName}>{lockedCount} in shop</Text>
      </Pressable>
    );
  };

  const outfitRow = (
    <View>
      {isDesktop ? (
        <H size={17} style={styles.section}>
          Outfit
        </H>
      ) : null}
      <View style={styles.outfits}>
        <OutfitChip compact={!isDesktop} label="None" icon="cancel" active={!profile.equippedOutfit} onPress={() => updateProfile((p) => ({ ...p, equippedOutfit: null }))} />
        {OUTFITS.filter((o) => profile.ownedOutfits.includes(o.id)).map((o) => (
          <OutfitChip
            key={o.id}
            compact={!isDesktop}
            label={o.name}
            emoji={o.emoji}
            active={profile.equippedOutfit === o.id}
            onPress={() => updateProfile((p) => ({ ...p, equippedOutfit: o.id }))}
          />
        ))}
        <OutfitChip compact={!isDesktop} label="More in shop" icon="cart-outline" onPress={() => navigation.navigate('Shop', { tab: 'outfits' })} />
      </View>
    </View>
  );

  const left = (
    <View style={[styles.left, isDesktop ? styles.leftDesk : styles.leftPhone]}>
      {preview}
      <View style={{ flex: 1 }} />
      {flow ? (
        <Button title="Continue to map select" icon="🗺️" small={!isDesktop} onPress={() => navigation.navigate('MapSelect', { flow })} />
      ) : null}
    </View>
  );

  const right = (
    <View style={styles.right}>
      <H size={isDesktop ? 17 : 14} style={isDesktop ? styles.section : styles.sectionPhone}>
        Skins ({owned.length})
      </H>
      <Grid
        items={tiles}
        minWidth={isDesktop ? 110 : 74}
        minHeight={isDesktop ? 120 : 70}
        gap={isDesktop ? 12 : 6}
        paged
        footer={outfitRow}
        renderItem={renderTile}
      />
    </View>
  );

  return (
    <Screen shell={route.params?.flow ? undefined : 'SkinSelect'}>
      <ScreenHeader title={flow ? `Choose skin · ${MODE_NAMES[flow.mode]}` : 'My skins'} />
      <View style={[styles.row, isDesktop && styles.rowDesk]}>
        {left}
        {right}
      </View>
    </Screen>
  );
}

function OutfitChip({ label, emoji, icon, active, onPress, compact = false }: { label: string; emoji?: string; icon?: IconName; active?: boolean; onPress: () => void; compact?: boolean }) {
  const size = compact ? 22 : 26;
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[styles.outfit, compact && styles.outfitCompact, active && styles.outfitOn]}>
      {icon ? <Icon name={icon} size={size} color={colors.gold} /> : <Glyph emoji={emoji ?? ''} size={size} color={colors.gold} />}
      {compact ? null : <Text style={styles.outfitLabel}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 14 },
  rowDesk: { gap: 28 },
  left: { gap: 10 },
  leftPhone: { width: 280 },
  leftDesk: { width: 360 },
  right: { flex: 1 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  previewPhone: { gap: 10, padding: 10 },
  rarity: { fontWeight: '900', fontSize: 12, textAlign: 'left', marginBottom: 4 },
  small: { fontSize: 12, lineHeight: 16 },
  section: { marginTop: 18, marginBottom: 8 },
  sectionPhone: { marginBottom: 4 },
  skin: { flex: 1, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 4 },
  skinOn: { borderColor: colors.toxic, borderWidth: 3 },
  skinName: { color: colors.text, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  skinNamePhone: { fontSize: 11 },
  rarityDot: { position: 'absolute', top: 7, left: 7, width: 8, height: 8, borderRadius: 4 },
  edit: { position: 'absolute', top: 4, right: 4 },
  add: { borderStyle: 'dashed' },
  outfits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  outfit: { width: 78, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, alignItems: 'center', gap: 4 },
  outfitCompact: { width: 44, height: 44, paddingVertical: 0, gap: 0, justifyContent: 'center' },
  outfitOn: { borderColor: colors.toxic, backgroundColor: 'rgba(198,255,61,0.16)' },
  outfitLabel: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
