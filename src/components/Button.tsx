import React, { useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';
import { playSfx } from '../services/sound';
import { Icon } from './Icon';
import type { IconName } from './Icon';

// Emoji passed as `icon` are drawn as line icons so the UI chrome stays consistent.
const GLYPHS: Record<string, IconName> = {
  '▶️': 'play', '🏁': 'flag-checkered', '➕': 'plus', '🚪': 'logout', '🔁': 'repeat', '🏠': 'home-variant', '⏭️': 'skip-next',
  '✋': 'hand-back-left', '✅': 'check-bold', '🔓': 'lock-open-variant', '✨': 'star-four-points', '👤': 'account', '🎨': 'palette',
  '📝': 'pencil', '📊': 'podium', '🛒': 'cart', '🔄': 'refresh', '🗺️': 'map-outline', '💾': 'content-save', '↩️': 'undo', '🧹': 'broom', '🧱': 'wall', '📤': 'share-variant', '🗑️': 'trash-can-outline',
};

type Variant = 'primary' | 'danger' | 'gold' | 'ghost' | 'dark' | 'blue';

// Flat fills. Every colored variant uses ink text so it stays readable.
const FILL: Record<Variant, string> = {
  primary: colors.toxic,
  danger: colors.blood,
  gold: colors.gold,
  blue: colors.blue,
  dark: colors.panelLight,
  ghost: 'transparent',
};

const DEPTH = 6;

interface Props {
  title: string;
  onPress?: () => void;
  icon?: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  /** Drawn before the title, e.g. a coin or an Icon. */
  lead?: React.ReactNode;
}

export function Button({ title, onPress, icon, variant = 'primary', disabled, loading, small, style, subtitle, lead }: Props) {
  const press = useRef(new Animated.Value(0)).current;
  const pressTo = (v: number) => Animated.timing(press, { toValue: v, duration: 70, useNativeDriver: true }).start();
  const ghost = variant === 'ghost';
  const lightText = variant === 'dark' || ghost;
  const fg = lightText ? colors.text : colors.ink;
  const depth = ghost ? 0 : small ? 4 : DEPTH;
  const translateY = press.interpolate({ inputRange: [0, 1], outputRange: [0, depth] });
  const r = small ? radius.sm : radius.md + 4;
  return (
    <View style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        disabled={disabled || loading}
        onPressIn={() => pressTo(1)}
        onPressOut={() => pressTo(0)}
        onPress={() => {
          haptic('light');
          playSfx('click', 0.7);
          onPress?.();
        }}
        style={{ borderRadius: r, backgroundColor: ghost ? 'transparent' : 'rgba(0,0,0,0.38)', paddingBottom: depth }}
      >
        <Animated.View
          style={[
            styles.btn,
            small && styles.small,
            { borderRadius: r, backgroundColor: FILL[variant], transform: [{ translateY }] },
            ghost && styles.ghost,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={fg} />
          ) : (
            <View style={styles.row}>
              {lead}
              <Text style={[styles.text, small && styles.textSmall, { color: fg }]}>{title}</Text>
              {icon ? (
                GLYPHS[icon] ? <Icon name={GLYPHS[icon]} size={small ? 16 : 20} color={fg} directional={icon === '▶️' || icon === '⏭️'} /> : <Text style={[styles.icon, small && styles.textSmall]}>{icon}</Text>
              ) : null}
            </View>
          )}
          {subtitle && !loading ? <Text style={[styles.sub, { color: lightText ? colors.textDim : 'rgba(11,10,7,0.72)' }]}>{subtitle}</Text> : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 0,
  },
  small: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 40 },
  ghost: { borderWidth: 2, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 18, fontWeight: '900' },
  textSmall: { fontSize: 13 },
  icon: { fontSize: 18 },
  sub: { fontSize: 11, marginTop: 2, fontWeight: '500' },
});
