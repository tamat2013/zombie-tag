// Full-screen "you are a survivor / zombie" animation shown at match start.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { tr } from '../i18n/language';
import { Text } from '../i18n/Text';
import type { GameMode, Role, Skin } from '../types';
import { Character } from './Character';
import { colors } from '../theme';

interface Props {
  role: Role;
  doctor?: boolean;
  skin: Skin;
  outfit?: string | null;
  mode: GameMode;
  secondsLeft: number;
}

export function RoleReveal({ role, doctor, skin, outfit, mode, secondsLeft }: Props) {
  const a = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(a, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]).start();
  }, [a, spin]);

  const zombie = role === 'zombie';
  const obstacle = mode === 'obstacle';
  const title = obstacle ? 'Obstacle Course' : zombie ? 'You are a zombie!' : doctor ? 'You are a doctor! 🩺' : 'You are a survivor!';
  const subtitle = obstacle
    ? 'Reach the finish line as fast as you can. Avoid saws and traps!'
    : zombie
      ? 'Touch survivors to infect them. Turn everyone into zombies!'
      : doctor
        ? 'A bitten survivor is frozen for 10 seconds – touch them to cure them. Follow the beeping and the blue arrows. If another doctor cures you, you lose your healing power.'
        : 'Do tasks, use abilities and survive until time runs out! You have one stone to throw to lure zombies somewhere else 🪨';
  const tint = obstacle ? colors.gold : zombie ? colors.zombie : colors.survivor;

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: zombie ? 'rgba(10,25,5,0.94)' : 'rgba(5,12,25,0.94)' }]}>
      <Animated.View
        style={{
          transform: [
            { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-200deg', '0deg'] }) },
          ],
        }}
      >
        <Character skin={skin} size={110} role={role} outfit={outfit} />
      </Animated.View>
      <Animated.Text style={[styles.title, { color: tint, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
        {tr(title)}
      </Animated.Text>
      <Text style={styles.sub}>{subtitle}</Text>
      <Text style={[styles.count, { color: tint }]}>{Math.max(1, Math.ceil(secondsLeft))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  title: { fontSize: 44, fontWeight: '900', marginTop: 24, textShadowColor: '#000', textShadowRadius: 10 },
  sub: { color: colors.text, fontSize: 16, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  count: { fontSize: 36, fontWeight: '900', marginTop: 14 },
});
