// The game is designed for landscape. The app follows the device rotation (both landscape sides
// and portrait), so when the device is held upright we ask to turn it instead of showing a sideways UI.
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../i18n/Text';
import { Icon } from './Icon';
import { colors } from '../theme';

export function RotateHint() {
  const { width, height } = useWindowDimensions();
  if (height <= width) return null;
  return (
    <View style={styles.cover} pointerEvents="auto">
      <Icon name="phone-rotate-landscape" size={72} color={colors.toxic} />
      <Text style={styles.title}>Rotate your device to landscape</Text>
      <Text style={styles.sub}>This game is played in landscape</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    zIndex: 1000,
    elevation: 1000,
  },
  title: { width: '100%', color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { width: '100%', color: colors.textDim, fontSize: 15, textAlign: 'center' },
});
