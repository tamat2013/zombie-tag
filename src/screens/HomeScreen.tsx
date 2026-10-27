// Main menu: player card, game modes and links to every other part of the game.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ScreenProps } from '../navigation/types';
import type { GameMode } from '../types';
import { Screen, CurrencyBar, ProgressBar } from '../components/ui';
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

interface ModeCard {
  mode: GameMode;
  title: string;
  subtitle: string;
  icon: string;
  gradient: [string, string];
}

const MODES: ModeCard[] = [
  { mode: 'classic', title: 'קלאסי', subtitle: 'שורדים נגד זומבים · 10 דקות', icon: '🧟', gradient: ['#3f9b1f', '#173d0c'] },
  { mode: 'tournament', title: 'טורנירים', subtitle: 'תחרויות מתוזמנות עם פרסים', icon: '🏆', gradient: ['#c98a00', '#4d3300'] },
  { mode: 'obstacle', title: 'מסלול מכשולים', subtitle: 'רוץ נגד השעון, אסוף מדליות', icon: '🏃', gradient: ['#2456b8', '#0c1f45'] },
  { mode: 'training', title: 'אימון', subtitle: 'תרגל מול בוטים בלי לחץ', icon: '🎯', gradient: ['#6d2bb8', '#26103f'] },
];

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const profile = useProfile();
  const { signOut } = useGame();
  const { width } = useWindowDimensions();
  const skin = findSkin(profile.selectedSkinId, profile.customSkins);
  const lvl = levelInfo(profile.xp);
  const missionsReady = claimableCount(profile, Date.now());
  const liveTournament = getTournaments(Date.now()).some((t) => tournamentStatus(t, Date.now()) === 'live');
  const wide = width > 700;

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
    if (mode === 'tournament') navigation.navigate('Tournaments');
    else navigation.navigate('SkinSelect', { flow: { mode } });
  };

  return (
    <Screen scroll>
      <View style={styles.top}>
        <CurrencyBar compact />
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.playerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.displayName}
            </Text>
            <Text style={styles.level}>
              רמה {lvl.level} · {lvl.into}/{lvl.needed} XP
            </Text>
            <ProgressBar value={lvl.progress} height={8} style={{ marginTop: 4 }} />
          </View>
          <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>
            <Character skin={skin} size={54} outfit={outfitEmoji(profile.equippedOutfit)} />
          </Animated.View>
        </Pressable>
      </View>

      <Text style={styles.logo}>זומבי: התפרצות</Text>
      {!authService.isOnline ? <Text style={styles.offline}>מצב לא מקוון · משחק מול בוטים</Text> : null}

      <View style={[styles.modes, wide && { flexDirection: 'row-reverse', flexWrap: 'wrap' }]}>
        {MODES.map((m) => (
          <Pressable
            key={m.mode}
            onPress={() => startMode(m.mode)}
            style={({ pressed }) => [wide ? { width: '48.5%' } : null, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <LinearGradient colors={m.gradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.mode}>
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>{m.title}</Text>
                <Text style={styles.modeSub}>{m.subtitle}</Text>
              </View>
              {m.mode === 'tournament' && liveTournament ? <Text style={styles.live}>● LIVE</Text> : null}
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        <MenuTile icon="🛒" label="חנות" onPress={() => navigation.navigate('Shop')} />
        <MenuTile icon="📋" label="משימות" badge={missionsReady} onPress={() => navigation.navigate('Missions')} />
        <MenuTile icon="🎨" label="הסקינים שלי" onPress={() => navigation.navigate('SkinSelect')} />
        <MenuTile icon="✏️" label="מעצב סקינים" onPress={() => navigation.navigate('SkinDesigner')} />
        <MenuTile icon="🗺️" label="יוצר מפות" onPress={() => navigation.navigate('MapCreator')} />
        <MenuTile icon="👤" label="פרופיל והישגים" onPress={() => navigation.navigate('Profile')} />
      </View>

      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>התנתקות</Text>
      </Pressable>
    </Screen>
  );
}

function MenuTile({ icon, label, onPress, badge }: { icon: string; label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.panel, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.border, flex: 1, maxWidth: 320 },
  name: { color: colors.text, fontWeight: '900', fontSize: 16, textAlign: 'right' },
  level: { color: colors.textDim, fontSize: 12, textAlign: 'right' },
  logo: { color: colors.toxic, fontSize: 34, fontWeight: '900', textAlign: 'center', marginTop: 22, textShadowColor: '#3f9b1f', textShadowRadius: 14 },
  offline: { color: colors.textMuted, textAlign: 'center', fontSize: 12, marginTop: 2 },
  modes: { gap: 10, marginTop: 18, justifyContent: 'space-between' },
  mode: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 2 },
  modeIcon: { fontSize: 44 },
  modeTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  modeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'right', marginTop: 2 },
  live: { color: '#ff4d4d', fontWeight: '900', fontSize: 12 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 18, justifyContent: 'center' },
  tile: { width: 104, height: 96, backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tileIcon: { fontSize: 30 },
  tileLabel: { color: colors.text, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.blood, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  signOut: { alignSelf: 'center', marginTop: 24, padding: 8 },
  signOutText: { color: colors.textMuted, fontWeight: '700', textDecorationLine: 'underline' },
});
