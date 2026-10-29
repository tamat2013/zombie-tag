import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { AbilityDef } from '../engine/abilities';
import { colors } from '../theme';

interface Props {
  def: AbilityDef;
  /** 0 = ready, 1 = just used */
  cooldown: number;
  remainingSec: number;
  active: boolean;
  suggested: boolean;
  disabled?: boolean;
  onPress: () => void;
  hotkey?: string;
}

export function AbilityButton({ def, cooldown, remainingSec, active, suggested, disabled, onPress, hotkey }: Props) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!suggested) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.2, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [suggested, glow]);

  const ready = cooldown <= 0;
  const ring = def.role === 'zombie' ? colors.zombie : colors.survivor;
  return (
    <Pressable onPress={onPress} disabled={disabled || !ready} hitSlop={6}>
      <View style={styles.wrap}>
        <Animated.View style={[styles.glow, { borderColor: colors.gold, opacity: glow, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }]} />
        <View style={[styles.btn, { borderColor: active ? colors.gold : ring, opacity: disabled ? 0.4 : 1 }]}>
          <Text style={styles.icon}>{def.icon}</Text>
          {!ready ? (
            <View style={[styles.shade, { height: `${Math.round(cooldown * 100)}%` }]}>
              <Text style={styles.cd}>{Math.ceil(remainingSec)}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {def.name}
          {hotkey ? ` (${hotkey})` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const SIZE = 62;
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: SIZE + 16 },
  glow: { position: 'absolute', top: -5, width: SIZE + 10, height: SIZE + 10, borderRadius: SIZE, borderWidth: 4 },
  btn: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: 'rgba(10,16,9,0.85)', borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  icon: { fontSize: 28 },
  shade: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'flex-end' },
  cd: { color: '#fff', fontWeight: '900', fontSize: 16, position: 'absolute', bottom: SIZE / 2 - 12 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 3, textShadowColor: '#000', textShadowRadius: 3 },
});
