// Main menu: player card, featured classic mode, other game modes and a bottom navigation bar.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { tr, useLanguage } from '../i18n/language';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { GameMode } from '../types';
import { Coin, HazardStripe, Screen, ProgressBar, Tag } from '../components/ui';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { findSkin } from '../data/skins';
import { outfitEmoji } from '../data/catalog';
import { levelInfo } from '../logic/progression';
import { claimableCount } from '../logic/missions';
import { getTournaments, tournamentStatus } from '../logic/tournaments';
import { authService } from '../services/authService';
import { colors, fonts, radius } from '../theme';
import { haptic } from '../utils/haptics';
import { playSfx } from '../services/sound';

interface ModeRow {
  mode: GameMode;
  title: string;
  subtitle: string;
  icon: IconName;
  tint: string;
}

const MODES: ModeRow[] = [
  { mode: 'tournament', title: 'Tournaments', subtitle: 'Scheduled competitions with prizes', icon: 'trophy-outline', tint: colors.gold },
  { mode: 'obstacle', title: 'Obstacle Course', subtitle: 'Race the clock, collect medals', icon: 'flag-outline', tint: colors.blue },
  { mode: 'training', title: 'Training', subtitle: 'Practice against bots, no pressure', icon: 'target', tint: colors.purple },
];

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  useLanguage();
  const profile = useProfile();
  const { signOut } = useGame();
  const skin = findSkin(profile.selectedSkinId, profile.customSkins);
  const lvl = levelInfo(profile.xp);
  const missionsReady = claimableCount(profile, Date.now());
  const liveTournament = getTournaments(Date.now()).some((t) => tournamentStatus(t, Date.now()) === 'live');

  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const startMode = (mode: GameMode) => {
    haptic('light');
    playSfx('click', 0.7);
    if (mode === 'tournament') navigation.navigate('Tournaments');
    else navigation.navigate('SkinSelect', { flow: { mode } });
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Text style={styles.logo}>ZOMBIE TAG</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.navigate('Settings')} accessibilityLabel={tr('Sound settings')} style={({ pressed }) => [styles.iconBtn, { marginRight: 8 }, pressed && styles.pressed]} hitSlop={6}>
          <Icon name="cog-outline" color={colors.textDim} />
        </Pressable>
        <Pressable onPress={signOut} accessibilityLabel={tr('Sign out')} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} hitSlop={6}>
          <Icon name="logout" color={colors.textDim} directional />
        </Pressable>
      </View>
      {!authService.isOnline ? <Text style={styles.offline}>Offline mode · playing against bots</Text> : null}

      <Pressable onPress={() => navigation.navigate('Profile')} style={({ pressed }) => [styles.playerCard, pressed && styles.pressed]}>
        <View style={styles.avatar}>
          <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }}>
            <Character skin={skin} size={40} outfit={outfitEmoji(profile.equippedOutfit)} />
          </Animated.View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{lvl.level}</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.displayName}
          </Text>
          <ProgressBar value={lvl.progress} height={10} />
          <Text style={styles.xp}>
            {lvl.into} / {lvl.needed} XP
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <View style={styles.stat}>
            <Coin />
            <Text style={[styles.statText, { color: colors.coin }]}>{profile.coins.toLocaleString()}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="medal-outline" size={15} color={colors.medal} />
            <Text style={[styles.statText, { color: colors.medal }]}>{profile.medals}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.hero}>
        <HazardStripe height={14} style={styles.heroStripe} />
        <View style={styles.heroBody}>
          <Tag text="Main mode · 10 minutes" />
          <Text style={styles.heroTitle}>Classic</Text>
          <Text style={styles.heroSub}>Survivors vs zombies. Get caught and you join the infection.</Text>
          <Pressable onPress={() => startMode('classic')} style={styles.heroBtnShadow}>
            {({ pressed }) => (
              <View style={[styles.heroBtn, pressed && { transform: [{ translateY: 4 }] }]}>
                <Text style={styles.heroBtnText}>Play now</Text>
                <Icon name="play" size={18} color={colors.ink} directional />
              </View>
            )}
          </Pressable>
          <Animated.View style={[styles.heroArt, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]} pointerEvents="none">
            <ZombieArt />
          </Animated.View>
        </View>
      </View>

      <View style={{ gap: 10, marginTop: 14 }}>
        {MODES.map((m) => (
          <Pressable key={m.mode} onPress={() => startMode(m.mode)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={[styles.rowIcon, { backgroundColor: m.tint }]}>
              <Icon name={m.icon} size={22} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{m.title}</Text>
              <Text style={styles.rowSub}>{m.subtitle}</Text>
            </View>
            {m.mode === 'tournament' && liveTournament ? (
              <View style={styles.live}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live now</Text>
              </View>
            ) : null}
            <Icon name="chevron-right" size={22} color={colors.textMuted} directional />
          </Pressable>
        ))}
      </View>

      <View style={styles.quick}>
        <Pressable onPress={() => navigation.navigate('SkinDesigner')} style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}>
          <Icon name="pencil-outline" size={18} color={colors.textDim} />
          <Text style={styles.quickText}>Skin designer</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('MapCreator')} style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}>
          <Icon name="map-outline" size={18} color={colors.textDim} />
          <Text style={styles.quickText}>Map creator</Text>
        </Pressable>
      </View>

      <View style={styles.nav}>
        <NavItem icon="home-variant-outline" label="Home" active />
        <NavItem icon="shopping-outline" label="Shop" onPress={() => navigation.navigate('Shop')} />
        <NavItem icon="clipboard-check-outline" label="Missions" badge={missionsReady} onPress={() => navigation.navigate('Missions')} />
        <NavItem icon="tshirt-crew-outline" label="Skins" onPress={() => navigation.navigate('SkinSelect')} />
        <NavItem icon="account-outline" label="Profile" onPress={() => navigation.navigate('Profile')} />
      </View>
    </Screen>
  );
}

/** Flat cartoon zombie head built from plain views (same drawing as the app icon). */
function ZombieArt() {
  return (
    <View style={{ width: 120, height: 130 }}>
      <View style={[za.arm, { top: 58, left: 0, transform: [{ rotate: '-10deg' }] }]} />
      <View style={[za.arm, { top: 86, left: 6, transform: [{ rotate: '7deg' }] }]} />
      <View style={za.head} />
      <View style={za.brow} />
      <View style={[za.eye, { right: 50, top: 40, width: 28, height: 28 }]}>
        <View style={[za.pupil, { width: 10, height: 10 }]} />
      </View>
      <View style={[za.eye, { right: 20, top: 48, width: 19, height: 19 }]}>
        <View style={[za.pupil, { width: 6, height: 6 }]} />
      </View>
      <View style={za.mouth}>
        <View style={za.tooth} />
        <View style={za.tooth} />
        <View style={za.tooth} />
      </View>
    </View>
  );
}

function NavItem({ icon, label, onPress, badge, active }: { icon: IconName; label: string; onPress?: () => void; badge?: number; active?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        if (onPress) playSfx('click', 0.6);
        onPress?.();
      }}
      style={[styles.navItem, active && styles.navItemActive]}
      accessibilityState={{ selected: !!active }}
    >
      <Icon name={icon} size={22} color={active ? colors.gold : colors.textDim} />
      <Text style={[styles.navLabel, active && { color: colors.gold, fontWeight: '700' }]}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const ink = { borderWidth: 2, borderColor: colors.ink };

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: colors.toxic, fontSize: 30, fontFamily: fonts.logo, textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.panel, ...ink, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
  offline: { color: colors.textMuted, textAlign: 'left', fontSize: 12, marginTop: 4 },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderRadius: radius.lg, padding: 12, ...ink, borderBottomWidth: 5, marginTop: 14 },
  avatar: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.panelLight, ...ink, alignItems: 'center', justifyContent: 'center' },
  levelBadge: { position: 'absolute', bottom: -8, left: -8, minWidth: 26, height: 26, borderRadius: 8, backgroundColor: colors.toxic, ...ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  levelBadgeText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  name: { color: colors.text, fontWeight: '700', fontSize: 16, textAlign: 'left' },
  xp: { color: colors.textDim, fontSize: 12, textAlign: 'left' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgAlt, borderRadius: 10, ...ink, paddingHorizontal: 9, paddingVertical: 3 },
  statText: { fontWeight: '700', fontSize: 14 },
  hero: { marginTop: 14, borderRadius: radius.lg, backgroundColor: colors.panel, ...ink, borderBottomWidth: 6, overflow: 'hidden' },
  heroStripe: { borderBottomWidth: 2, borderColor: colors.ink },
  heroBody: { minHeight: 210, padding: 18, paddingBottom: 20, alignItems: 'flex-start', gap: 8 },
  heroTitle: { color: colors.text, fontSize: 46, fontWeight: '900', lineHeight: 50, letterSpacing: -1, marginTop: 4 },
  heroSub: { color: colors.textDim, fontSize: 14, textAlign: 'left', maxWidth: 196, lineHeight: 20 },
  heroBtnShadow: { marginTop: 8, borderRadius: 12, backgroundColor: colors.ink, paddingBottom: 4, zIndex: 2 },
  heroBtn: { height: 50, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.gold, ...ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  heroArt: { position: 'absolute', right: 12, bottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 70, paddingHorizontal: 14, borderRadius: radius.md, ...ink, borderBottomWidth: 5, backgroundColor: colors.panel },
  rowIcon: { width: 44, height: 44, borderRadius: 12, ...ink, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'left' },
  rowSub: { color: colors.textDim, fontSize: 13, textAlign: 'left', marginTop: 2 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.blood, borderRadius: 6, ...ink, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  liveText: { color: colors.ink, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  quick: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#4a463b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickText: { color: colors.textDim, fontSize: 14, fontWeight: '500' },
  nav: { flexDirection: 'row', marginTop: 20, backgroundColor: colors.bgAlt, borderRadius: radius.lg, ...ink, padding: 4 },
  navItem: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12 },
  navItemActive: { backgroundColor: colors.panelLight },
  navLabel: { color: colors.textDim, fontSize: 12, fontWeight: '500' },
  badge: { position: 'absolute', top: 4, right: '50%', marginRight: -26, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: colors.blood, ...ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.ink, fontWeight: '900', fontSize: 11 },
});

const za = StyleSheet.create({
  arm: { position: 'absolute', width: 54, height: 20, borderRadius: 10, backgroundColor: '#7fc23a', borderWidth: 2.5, borderColor: colors.ink },
  head: { position: 'absolute', right: 0, top: 10, width: 100, height: 116, borderTopLeftRadius: 50, borderTopRightRadius: 50, borderBottomLeftRadius: 42, borderBottomRightRadius: 42, backgroundColor: colors.toxic, borderWidth: 3, borderColor: colors.ink },
  brow: { position: 'absolute', right: 34, top: 28, width: 30, height: 3, backgroundColor: colors.ink, transform: [{ rotate: '-14deg' }] },
  eye: { position: 'absolute', borderRadius: 20, backgroundColor: colors.text, borderWidth: 2.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  pupil: { borderRadius: 6, backgroundColor: colors.ink },
  mouth: { position: 'absolute', right: 24, top: 88, width: 50, height: 15, borderRadius: 8, backgroundColor: colors.ink, flexDirection: 'row', justifyContent: 'space-evenly' },
  tooth: { width: 7, height: 6, backgroundColor: colors.text },
});
