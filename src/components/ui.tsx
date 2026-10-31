// Small shared building blocks: screen wrapper, header, currency bar, progress bar, cards, toasts.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Pressable, ScrollView, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radius } from '../theme';
import { useGame } from '../state/GameContext';
import { levelInfo } from '../logic/progression';
import { Icon, Glyph } from './Icon';
import { SideBar, TabBar } from './AppShell';
import type { ShellKey } from './AppShell';
import { useDevice } from '../utils/device';

export function Screen({ children, scroll, style, shell }: { children: React.ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle>; shell?: ShellKey }) {
  const { isDesktop } = useDevice();
  // The phone never scrolls: every screen is laid out to fit its height. The desktop fills the window; long screens scroll, short ones stretch.
  const body = isDesktop && scroll ? (
    <ScrollView contentContainerStyle={[{ flexGrow: 1, padding: 28, paddingBottom: 40 }, style]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: isDesktop ? 28 : 10, overflow: 'hidden' }, style]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'top', 'bottom']}>
        {shell && isDesktop ? (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <SideBar active={shell} />
            <View style={{ flex: 1 }}>{body}</View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>{body}</View>
            {shell ? <TabBar active={shell} /> : null}
          </View>
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
  const { isDesktop } = useDevice();
  return (
    <View style={[styles.header, !isDesktop && styles.headerPhone]}>
      <Pressable
        onPress={() => (onBack ? onBack() : nav.canGoBack() && nav.goBack())}
        style={({ pressed }) => [styles.back, !isDesktop && styles.backPhone, pressed && styles.pressed]}
        hitSlop={10}
        accessibilityLabel="Back"
      >
        <Icon name="arrow-left" size={isDesktop ? 24 : 20} directional />
      </Pressable>
      <Text style={[styles.headerTitle, !isDesktop && styles.headerTitlePhone]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerSide}>{right ?? <CurrencyBar compact />}</View>
    </View>
  );
}

/** A flat gold coin: a circle with an ink outline. */
export function Coin({ size = 14 }: { size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.coin, borderWidth: 2, borderColor: '#b8860b' }} />;
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
      {icon ? <Glyph emoji={icon} size={16} color={color} /> : null}
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
    <View style={[{ height, borderRadius: height / 2, backgroundColor: 'rgba(0,0,0,0.35)', overflow: 'hidden' }, style]}>
      <Animated.View style={{ height: '100%', borderRadius: 99, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
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

/** Tabs wrap onto a second line instead of scrolling sideways, so nothing hides off-screen. */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {tabs.map((t) => (
        <Pressable key={t.id} onPress={() => onChange(t.id)} style={[styles.tab, value === t.id && styles.tabActive]}>
          <Text style={[styles.tabText, value === t.id && styles.tabTextActive]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * A grid that fills the space it is given. With `paged` it fits as many rows as the height allows and
 * pages through the rest with arrows, so nothing scrolls. Without it the grid wraps and grows with its content.
 * A footer (e.g. filter chips) sits under the grid and shares its row with the pager.
 */
export function Grid<T>({
  items,
  renderItem,
  minWidth,
  minHeight = 80,
  gap = 10,
  paged = false,
  footer,
}: {
  items: T[];
  renderItem: (item: T, size: { width: number; height: number }) => React.ReactNode;
  minWidth: number;
  minHeight?: number;
  gap?: number;
  paged?: boolean;
  footer?: React.ReactNode;
}) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [page, setPage] = useState(0);
  const measure = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };
  const cols = box ? Math.max(1, Math.floor((box.width + gap) / (minWidth + gap))) : 1;
  const rows = paged && box ? Math.max(1, Math.floor((box.height + gap) / (minHeight + gap))) : 0;
  const perPage = paged ? Math.max(1, cols * rows) : items.length;
  const pages = Math.max(1, Math.ceil(items.length / Math.max(1, perPage)));
  const current = Math.min(page, pages - 1);
  const shown = paged ? items.slice(current * perPage, current * perPage + perPage) : items;
  const cellW = box ? (box.width - gap * (cols - 1)) / cols : 0;
  const cellH = paged && box ? (box.height - gap * (rows - 1)) / rows : minHeight;
  const grid = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignContent: 'flex-start' }}>
      {box
        ? shown.map((item, i) => (
            <View key={current * perPage + i} style={{ width: cellW, height: cellH }}>
              {renderItem(item, { width: cellW, height: cellH })}
            </View>
          ))
        : null}
    </View>
  );
  // The footer row holds the caller's footer (e.g. filter chips) and the pager, side by side.
  const footerRow =
    footer || pages > 1 ? (
      <View style={styles.footer}>
        <View style={{ flex: 1 }}>{footer}</View>
        {pages > 1 ? (
          <View style={styles.pager}>
            <Pressable onPress={() => setPage(current - 1)} disabled={current === 0} accessibilityLabel="Previous page" style={[styles.pagerBtn, current === 0 && styles.pagerOff]}>
              <Icon name="chevron-left" size={20} color={colors.ink} directional />
            </Pressable>
            <Text style={styles.pagerText}>
              {current + 1} / {pages}
            </Text>
            <Pressable onPress={() => setPage(current + 1)} disabled={current === pages - 1} accessibilityLabel="Next page" style={[styles.pagerBtn, current === pages - 1 && styles.pagerOff]}>
              <Icon name="chevron-right" size={20} color={colors.ink} directional />
            </Pressable>
          </View>
        ) : null}
      </View>
    ) : null;
  if (!paged) return <View onLayout={measure}>{grid}{footerRow}</View>;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flex: 1, overflow: 'hidden' }} onLayout={measure}>
        {grid}
      </View>
      {footerRow}
    </View>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        {icon ? <Glyph emoji={icon} size={18} color={border} /> : null}
        <Text style={styles.toastText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  headerSide: { alignItems: 'flex-end' },
  headerPhone: { marginBottom: 6, gap: 8 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'left' },
  headerTitlePhone: { fontSize: 22 },
  back: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.panelLight, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderColor: 'rgba(0,0,0,0.3)' },
  backPhone: { width: 36, height: 36, borderRadius: 18, borderBottomWidth: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, height: 36 },
  pagerBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.toxic, borderBottomWidth: 3, borderColor: colors.toxicDark, alignItems: 'center', justifyContent: 'center' },
  pagerOff: { opacity: 0.3 },
  pagerText: { color: colors.textDim, fontWeight: '800', fontSize: 13, minWidth: 48, textAlign: 'center' },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
  currency: { flexDirection: 'row', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(13,10,31,0.55)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)' },
  pillText: { fontWeight: '800', fontSize: 14 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  tagText: { color: colors.ink, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { backgroundColor: colors.panel, borderRadius: radius.md, padding: 14, borderWidth: 2, borderBottomWidth: 5, borderColor: 'rgba(255,255,255,0.1)', borderBottomColor: 'rgba(0,0,0,0.35)' },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.panel, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  tabActive: { backgroundColor: colors.toxic, borderColor: colors.toxicDark, borderBottomWidth: 4 },
  tabText: { color: colors.textDim, fontWeight: '800', fontSize: 14 },
  tabTextActive: { color: colors.ink, fontWeight: '900' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: colors.panel },
  chipText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  toastHost: { position: 'absolute', top: 18, left: 0, right: 0, alignItems: 'center', gap: 6, zIndex: 999 },
  toast: { backgroundColor: colors.panel, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22, borderWidth: 2, borderBottomWidth: 5, maxWidth: '80%' },
  toastText: { color: colors.text, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
