// Opening animation: the title smashes in letter by letter, a zombie rises from the ground
// and the screen flickers. Tap anywhere to skip.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { Character } from '../components/Character';
import { Icon } from '../components/Icon';
import { BUILT_IN_SKINS } from '../data/skins';

const TITLE = 'ZOMBIE';
const SUBTITLE = 'OUTBREAK';

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const letters = useRef(TITLE.split('').map(() => new Animated.Value(0))).current;
  const rise = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const sub = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    Animated.sequence([
      Animated.timing(rise, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.stagger(
        110,
        letters.map((v) => Animated.spring(v, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })),
      ),
      Animated.parallel([
        Animated.timing(sub, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(flicker, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 0.7, duration: 50, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(900),
    ]).start(() => finish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable style={{ flex: 1 }} onPress={finish}>
      <Animated.View style={{ flex: 1, opacity: fadeOut }}>
        <LinearGradient colors={[colors.bgAlt, colors.bg, '#4b1fa8']} style={styles.wrap}>
          <Animated.View
            style={[
              styles.zombie,
              {
                transform: [
                  { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [220, 0] }) },
                  { rotate: rise.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <Character skin={BUILT_IN_SKINS[9]} size={150} role="zombie" />
          </Animated.View>
          <View style={styles.ground} />
          <View style={styles.titleRow}>
            {letters.map((v, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.letter,
                  {
                    opacity: v,
                    transform: [
                      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) },
                      { scale: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [2.4, 0.9, 1] }) },
                      { rotate: `${(i % 2 ? 1 : -1) * 4}deg` },
                    ],
                  },
                ]}
              >
                {TITLE[i]}
              </Animated.Text>
            ))}
          </View>
          <Animated.Text style={[styles.sub, { opacity: sub, transform: [{ scale: sub.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
            {SUBTITLE}
          </Animated.Text>
          <View style={styles.skip}>
            <Icon name="gesture-tap" size={30} color={colors.textDim} />
          </View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.blood, opacity: flicker.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  zombie: { alignItems: 'center' },
  ground: { width: 260, height: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.35)', marginTop: -10, marginBottom: 20 },
  titleRow: { flexDirection: 'row' },
  letter: { fontFamily: fonts.logo, color: colors.toxic, fontSize: 64, fontWeight: '900', marginHorizontal: 2, textShadowColor: colors.toxicDark, textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 0 },
  sub: { fontFamily: fonts.logo, color: colors.blood, fontSize: 34, fontWeight: '900', marginTop: 4, letterSpacing: 4, textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  skip: { position: 'absolute', bottom: 30, opacity: 0.7 },
});
