import React, { useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';
import { playSfx } from '../services/sound';

type Variant = 'primary' | 'danger' | 'gold' | 'ghost' | 'dark' | 'blue';

const GRADIENTS: Record<Variant, [string, string]> = {
  primary: ['#8dff5c', '#2f8f17'],
  danger: ['#ff5a5f', '#9b1c1f'],
  gold: ['#ffe08a', '#c98a00'],
  blue: ['#6fb1ff', '#2456b8'],
  dark: ['#2c3b2e', '#18221a'],
  ghost: ['transparent', 'transparent'],
};

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
}

export function Button({ title, onPress, icon, variant = 'primary', disabled, loading, small, style, subtitle }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressTo = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  const dark = variant === 'primary' || variant === 'gold';
  return (
    <Animated.View style={[{ transform: [{ scale }], opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        disabled={disabled || loading}
        onPressIn={() => pressTo(0.95)}
        onPressOut={() => pressTo(1)}
        onPress={() => {
          haptic('light');
          playSfx('click', 0.7);
          onPress?.();
        }}
      >
        <LinearGradient
          colors={GRADIENTS[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.btn, small && styles.small, variant === 'ghost' && styles.ghost]}
        >
          {loading ? (
            <ActivityIndicator color={dark ? '#0b0f0a' : '#fff'} />
          ) : (
            <View style={styles.row}>
              <Text style={[styles.text, small && styles.textSmall, { color: dark ? '#0b0f0a' : colors.text }]}>
                {title}
              </Text>
              {icon ? <Text style={[styles.icon, small && styles.textSmall]}>{icon}</Text> : null}
            </View>
          )}
          {subtitle && !loading ? <Text style={[styles.sub, { color: dark ? '#1a2a12' : colors.textDim }]}>{subtitle}</Text> : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  small: { paddingVertical: 7, paddingHorizontal: 12, minHeight: 34, borderRadius: radius.sm },
  ghost: { borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  textSmall: { fontSize: 13 },
  icon: { fontSize: 18 },
  sub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});
