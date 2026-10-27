// Small shared building blocks: screen wrapper, header, currency bar, progress bar, cards, toasts.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radius } from '../theme';
import { useGame } from '../state/GameContext';
import { levelInfo } from '../logic/progression';

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
  return <Text style={[{ color: colors.text, fontSize: size, fontWeight: '900', textAlign: 'right' }, style]}>{children}</Text>;
}

export function P({ children, style, dim }: { children: React.ReactNode; style?: StyleProp<TextStyle>; dim?: boolean }) {
  return <Text style={[{ color: dim ? colors.textDim : colors.text, fontSize: 14, textAlign: 'right', lineHeight: 20 }, style]}>{children}</Text>;
}

export function ScreenHeader({ title, right, onBack }: { title: string; right?: React.ReactNode; onBack?: () => void }) {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{right ?? <CurrencyBar />}</View>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={() => (onBack ? onBack() : nav.canGoBack() && nav.goBack())}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
        hitSlop={10}
      >
        <Text style={styles.backText}>→</Text>
      </Pressable>
    </View>
  );
}

export function CurrencyBar({ compact }: { compact?: boolean }) {
  const { profile } = useGame();
  if (!profile) return null;
  const lvl = levelInfo(profile.xp);
  return (
    <View style={styles.currency}>
      <Pill text={`${profile.coins.toLocaleString()}`} icon="🪙" color={colors.coin} />
      <Pill text={`${profile.medals}`} icon="🏅" color={colors.medal} />
      {!compact ? <Pill text={`רמה ${lvl.level}`} icon="⭐" color={colors.toxic} /> : null}
    </View>
  );
}

export function Pill({ text, icon, color = colors.text, style }: { text: string; icon?: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, style]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
      {icon ? <Text style={styles.pillIcon}>{icon}</Text> : null}
    </View>
  );
}

export function ProgressBar({ value, color = colors.toxic, height = 10, style }: { value: number; color?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(0, Math.min(1, value)), duration: 450, useNativeDriver: false }).start();
  }, [value, anim]);
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: '#0a0f09', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, style]}>
      <Animated.View style={{ height: '100%', backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function Card({ children, style, onPress, highlight }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; highlight?: string }) {
  const content = <View style={[styles.card, highlight ? { borderColor: highlight, borderWidth: 2 } : null, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}>
      {content}
    </Pressable>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, flexDirection: 'row-reverse' }} style={{ flexGrow: 0 }}>
      {tabs.map((t) => (
        <Pressable key={t.id} onPress={() => onChange(t.id)} style={[styles.tab, value === t.id && styles.tabActive]}>
          <Text style={[styles.tabText, value === t.id && { color: '#0b0f0a' }]}>{t.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Chip({ label, active, onPress, color = colors.toxic }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, active && { color: '#0b0f0a' }]}>{label}</Text>
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
  const border = tone === 'good' ? colors.toxic : tone === 'bad' ? colors.blood : colors.border;
  return (
    <Animated.View style={[styles.toast, { borderColor: border, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <Text style={styles.toastText}>
        {text} {icon ?? ''}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  headerSide: { flex: 1, alignItems: 'flex-start' },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '900', flexShrink: 1, textAlign: 'right' },
  back: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  backText: { color: colors.text, fontSize: 22, fontWeight: '900' },
  currency: { flexDirection: 'row', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  pillText: { fontWeight: '800', fontSize: 13 },
  pillIcon: { fontSize: 13 },
  card: { backgroundColor: colors.panel, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.toxic, borderColor: colors.toxic },
  tabText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  toastHost: { position: 'absolute', top: 18, left: 0, right: 0, alignItems: 'center', gap: 6, zIndex: 999 },
  toast: { backgroundColor: 'rgba(12,18,11,0.95)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 2, maxWidth: '80%' },
  toastText: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'center' },
});
