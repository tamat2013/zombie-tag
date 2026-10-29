// Main menu: player card, featured classic mode, other game modes and a bottom navigation bar.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScreenProps } from '../navigation/types';
import type { GameMode } from '../types';
import { Screen, ProgressBar } from '../components/ui';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { findSkin } from '../data/skins';
import { outfitEmoji } from '../data/catalog';
import { levelInfo } from '../logic/progression';
import { claimableCount } from '../logic/missions';
import { getTournaments, tournamentStatus } from '../logic/tournaments';
import { authService } from '../services/authService';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';
import { playSfx } from '../services/sound';

interface ModeRow {
  mode: GameMode;
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
}

const MODES: ModeRow[] = [
  { mode: 'tournament', title: 'Tournaments', subtitle: 'Scheduled competitions with prizes', icon: '🏆', tint: '#2a2210' },
  { mode: 'obstacle', title: 'Obstacle Course', subtitle: 'Race the clock, collect medals', icon: '🏃', tint: '#101c2e' },
  { mode: 'training', title: 'Training', subtitle: 'Practice against bots, no pressure', icon: '🎯', tint: '#231a33' },
];

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
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
        <Text style={styles.logo}>Zombie Outbreak</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.navigate('Settings')} accessibilityLabel="Sound settings" style={[styles.iconBtn, { marginRight: 8 }]} hitSlop={6}>
          <Text style={styles.iconBtnText}>⚙️</Text>
        </Pressable>
        <Pressable onPress={signOut} accessibilityLabel="Sign out" style={styles.iconBtn} hitSlop={6}>
          <Text style={styles.iconBtnText}>⎋</Text>
        </Pressable>
      </View>
      {!authService.isOnline ? <Text style={styles.offline}>Offline mode · playing against bots</Text> : null}

      <Pressable onPress={() => navigation.navigate('Profile')} style={styles.playerCard}>
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
          <ProgressBar value={lvl.progress} height={8} />
          <Text style={styles.xp}>
            {lvl.into} / {lvl.needed} XP
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <View style={styles.stat}>
            <Text style={[styles.statText, { color: colors.coin }]}>{profile.coins.toLocaleString()}</Text>
            <Text style={styles.statIcon}>🪙</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statText, { color: colors.medal }]}>{profile.medals}</Text>
            <Text style={styles.statIcon}>🏅</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.heroTag}>Main mode · 10 minutes</Text>
        <Text style={styles.heroTitle}>Classic</Text>
        <Text style={styles.heroSub}>Survivors vs zombies. Get caught and you join the infection.</Text>
        <Pressable onPress={() => startMode('classic')} style={({ pressed }) => [styles.heroBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
          <Text style={styles.heroBtnText}>Play now</Text>
        </Pressable>
        <Text style={styles.heroArt}>🧟</Text>
      </View>

      <View style={{ gap: 10, marginTop: 14 }}>
        {MODES.map((m) => (
          <Pressable key={m.mode} onPress={() => startMode(m.mode)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
            <View style={[styles.rowIcon, { backgroundColor: m.tint }]}>
              <Text style={styles.rowIconText}>{m.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{m.title}</Text>
              <Text style={styles.rowSub}>{m.subtitle}</Text>
            </View>
            {m.mode === 'tournament' && liveTournament ? <Text style={styles.live}>Live now</Text> : null}
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.quick}>
        <Pressable onPress={() => navigation.navigate('SkinDesigner')} style={styles.quickBtn}>
          <Text style={styles.quickText}>✏️ Skin designer</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('MapCreator')} style={styles.quickBtn}>
          <Text style={styles.quickText}>🗺️ Map creator</Text>
        </Pressable>
      </View>

      <View style={styles.nav}>
        <NavItem icon="🏠" label="Home" active />
        <NavItem icon="🛒" label="Shop" onPress={() => navigation.navigate('Shop')} />
        <NavItem icon="📋" label="Missions" badge={missionsReady} onPress={() => navigation.navigate('Missions')} />
        <NavItem icon="🎨" label="Skins" onPress={() => navigation.navigate('SkinSelect')} />
        <NavItem icon="👤" label="Profile" onPress={() => navigation.navigate('Profile')} />
      </View>
    </Screen>
  );
}

function NavItem({ icon, label, onPress, badge, active }: { icon: string; label: string; onPress?: () => void; badge?: number; active?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        if (onPress) playSfx('click', 0.6);
        onPress?.();
      }}
      style={[styles.navItem, active && styles.navItemActive]}
    >
      <Text style={styles.navIcon}>{icon}</Text>
      <Text style={[styles.navLabel, active && { color: colors.toxic, fontWeight: '700' }]}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: colors.toxic, fontSize: 22, fontWeight: '900' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: colors.textDim, fontSize: 20 },
  offline: { color: colors.textMuted, textAlign: 'left', fontSize: 12, marginTop: 2 },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, marginTop: 14 },
  avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  levelBadge: { position: 'absolute', bottom: -6, left: -6, minWidth: 24, height: 24, borderRadius: 8, backgroundColor: colors.toxic, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  levelBadgeText: { color: colors.bg, fontSize: 12, fontWeight: '900' },
  name: { color: colors.text, fontWeight: '700', fontSize: 16, textAlign: 'left' },
  xp: { color: colors.textDim, fontSize: 12, textAlign: 'left' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4 },
  statText: { fontWeight: '700', fontSize: 14 },
  statIcon: { fontSize: 14 },
  hero: { marginTop: 14, minHeight: 230, borderRadius: radius.lg, backgroundColor: '#101a0e', borderWidth: 1, borderColor: colors.toxic, padding: 20, alignItems: 'flex-start', justifyContent: 'space-between', overflow: 'hidden' },
  heroTag: { color: colors.toxic, fontSize: 12, fontWeight: '700' },
  heroTitle: { color: colors.text, fontSize: 40, fontWeight: '900', lineHeight: 46 },
  heroSub: { color: colors.textDim, fontSize: 14, textAlign: 'left', maxWidth: 220, lineHeight: 20 },
  heroBtn: { height: 48, paddingHorizontal: 28, borderRadius: 12, backgroundColor: colors.toxic, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  heroBtnText: { color: colors.bg, fontSize: 16, fontWeight: '900' },
  heroArt: { position: 'absolute', right: 14, top: 40, fontSize: 96, opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  rowIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowIconText: { fontSize: 24 },
  rowTitle: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'left' },
  rowSub: { color: colors.textDim, fontSize: 13, textAlign: 'left', marginTop: 2 },
  live: { color: '#ff7b7e', backgroundColor: '#2a1213', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '900', overflow: 'hidden' },
  chevron: { color: colors.textMuted, fontSize: 26 },
  quick: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quickText: { color: colors.textDim, fontSize: 14, fontWeight: '500' },
  nav: { flexDirection: 'row', marginTop: 20, backgroundColor: colors.bgAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 4 },
  navItem: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12 },
  navItemActive: { backgroundColor: colors.panelLight },
  navIcon: { fontSize: 20 },
  navLabel: { color: colors.textDim, fontSize: 12 },
  badge: { position: 'absolute', top: 4, right: '50%', marginRight: -26, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.blood, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
});
