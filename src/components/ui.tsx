// Small shared building blocks: screen wrapper, header, currency bar, progress bar, cards, toasts.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Pressable, ScrollView, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radius } from '../theme';
import { useGame } from '../state/GameContext';
import { levelInfo } from '../logic/progression';
import { Icon } from './Icon';

export function Screen({ children, scroll, style }: { children: React.ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'top', 'bottom']}>
        {scroll ? (
          <ScrollView contentContainerStyle={[{ padding: 16, paddingBottom: 40 }, style]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, padding: 12 }, style]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

export function H({ children, style, size = 22 }: { children: React.ReactNode; style?: StyleProp<TextStyle>; size?: number }) {
  return <Text style={[{ color: colors.text, fontSize: size, fontWeight: '900', textAlign: 'left' }, style]}>{children}</Text>;
}

export function P({ children, style, dim }: { children: React.ReactNode; style?: StyleProp<TextStyle>; dim?: boolean }) {
  return <Text style={[{ color: dim ? colors.textDim : colors.text, fontSize: 14, textAlign: 'left', lineHeight: 20 }, style]}>{children}</Text>;
}

export function ScreenHeader({ title, right, onBack }: { title: string; right?: React.ReactNode; onBack?: () => void }) {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => (onBack ? onBack() : nav.canGoBack() && nav.goBack())}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        hitSlop={10}
        accessibilityLabel="Back"
      >
        <Icon name="arrow-left" size={24} directional />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerSide}>{right ?? <CurrencyBar compact />}</View>
    </View>
  );
}

/** A flat gold coin: a circle with an ink outline. */
export function Coin({ size = 14 }: { size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.coin, borderWidth: 2, borderColor: colors.ink }} />;
}

export function CurrencyBar({ compact }: { compact?: boolean }) {
  const { profile } = useGame();
  if (!profile) return null;
  const lvl = levelInfo(profile.xp);
  return (
    <View style={styles.currency}>
      <Pill text={`${profile.coins.toLocaleString()}`} lead={<Coin />} color={colors.coin} />
      <Pill text={`${profile.medals}`} lead={<Icon name="medal-outline" size={15} color={colors.medal} />} color={colors.medal} />
      {!compact ? <Pill text={`Level ${lvl.level}`} lead={<Icon name="star-four-points" size={13} color={colors.toxic} />} color={colors.toxic} /> : null}
    </View>
  );
}

export function Pill({ text, icon, lead, color = colors.text, style }: { text: string; icon?: string; lead?: React.ReactNode; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, style]}>
      {lead}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
      {icon ? <Text style={styles.pillIcon}>{icon}</Text> : null}
    </View>
  );
}

/** Small tilted label, like a sticker slapped on a crate. */
export function Tag({ text, color = colors.toxic, tilt = -3, style }: { text: string; color?: string; tilt?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tag, { backgroundColor: color, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

/** Yellow and black hazard tape. */
export function HazardStripe({ height = 14, color = colors.gold, style }: { height?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const stripe = height * 1.4;
  const count = 60;
  return (
    <View style={[{ height, overflow: 'hidden', backgroundColor: colors.ink, flexDirection: 'row' }, style]} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: stripe, height: height * 3, marginTop: -height, marginRight: stripe, backgroundColor: color, transform: [{ skewX: '-45deg' }] }} />
      ))}
    </View>
  );
}

export function ProgressBar({ value, color = colors.toxic, height = 10, style }: { value: number; color?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(0, Math.min(1, value)), duration: 450, useNativeDriver: false }).start();
  }, [value, anim]);
  return (
    <View style={[{ height, borderRadius: 6, backgroundColor: colors.bgAlt, borderWidth: 2, borderColor: colors.ink, overflow: 'hidden' }, style]}>
      <Animated.View style={{ height: '100%', backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function Card({ children, style, onPress, highlight }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; highlight?: string }) {
  const content = <View style={[styles.card, highlight ? { borderColor: highlight } : null, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, flexDirection: 'row' }} style={{ flexGrow: 0 }}>
      {tabs.map((t) => (
        <Pressable key={t.id} onPress={() => onChange(t.id)} style={[styles.tab, value === t.id && styles.tabActive]}>
          <Text style={[styles.tabText, value === t.id && styles.tabTextActive]}>{t.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Chip({ label, active, onPress, color = colors.toxic }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: color }]}>
      <Text style={[styles.chipText, active && { color: colors.ink, fontWeight: '800' }]}>{label}</Text>
    </Pressable>
  );
}

export function ToastHost() {
  const { toasts } = useGame();
  return (
    <View pointerEvents="none" style={styles.toastHost}>
      {toasts.map((t) => (
        <ToastItem key={t.id} text={t.text} icon={t.icon} tone={t.tone} />
      ))}
    </View>
  );
}

function ToastItem({ text, icon, tone }: { text: string; icon?: string; tone?: 'info' | 'good' | 'bad' }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(a, { toValue: 1, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [a]);
  const border = tone === 'good' ? colors.toxic : tone === 'bad' ? colors.blood : colors.gold;
  return (
    <Animated.View style={[styles.toast, { borderColor: border, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <Text style={styles.toastText}>
        {text} {icon ?? ''}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  headerSide: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'left' },
  back: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 4, borderColor: colors.ink },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
  currency: { flexDirection: 'row', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bgAlt, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 2, borderColor: colors.ink },
  pillText: { fontWeight: '700', fontSize: 13 },
  pillIcon: { fontSize: 13 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 2, borderColor: colors.ink },
  tagText: { color: colors.ink, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  card: { backgroundColor: colors.panel, borderRadius: radius.md, padding: 12, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.ink },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.ink },
  tabActive: { backgroundColor: colors.gold, borderBottomWidth: 4 },
  tabText: { color: colors.textDim, fontWeight: '500', fontSize: 14 },
  tabTextActive: { color: colors.ink, fontWeight: '800' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.panel },
  chipText: { color: colors.text, fontWeight: '500', fontSize: 13 },
  toastHost: { position: 'absolute', top: 18, left: 0, right: 0, alignItems: 'center', gap: 6, zIndex: 999 },
  toast: { backgroundColor: colors.panel, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderBottomWidth: 5, maxWidth: '80%' },
  toastText: { color: colors.text, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
