// Draws a player from a Skin: round body, pattern, eyes, accessory and outfit.
// Zombies get a sickly green tint, stitches and glowing eyes.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../i18n/Text';
import type { Role, Skin } from '../types';

interface Props {
  skin: Skin;
  size: number;
  role?: Role;
  outfit?: string | null;
  facing?: number; // radians, eyes look this way
  shielded?: boolean;
  ghosted?: boolean;
}

function mix(hex: string, other: string, t: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

function CharacterImpl({ skin, size, role = 'survivor', outfit, facing = 0, shielded, ghosted }: Props) {
  const zombie = role === 'zombie';
  const body = zombie ? mix(skin.body, '#6b8f3a', 0.55) : skin.body;
  const accent = zombie ? mix(skin.accent, '#2d3b16', 0.5) : skin.accent;
  const r = size / 2;
  const lookX = Math.cos(facing) * size * 0.06;
  const lookY = Math.sin(facing) * size * 0.06;
  const eyeSize = size * 0.2;
  const eyeColor = zombie ? '#d4ff3a' : '#ffffff';
  const pupil = zombie ? '#ff2a2a' : '#111';

  const eye = (left: number) => {
    const style = { left, top: size * 0.3, width: eyeSize, height: skin.eyes === 'sleepy' ? eyeSize * 0.55 : eyeSize };
    return (
      <View key={left} style={[styles.eye, style, { backgroundColor: eyeColor, borderRadius: eyeSize / 2 }]}>
        <View
          style={{
            width: eyeSize * 0.45,
            height: eyeSize * 0.45,
            borderRadius: eyeSize,
            backgroundColor: pupil,
            transform: [{ translateX: lookX }, { translateY: lookY }],
          }}
        />
        {skin.eyes === 'angry' ? (
          <View style={[styles.brow, { width: eyeSize * 1.1, height: size * 0.05, top: -size * 0.04, backgroundColor: accent, transform: [{ rotate: left < r ? '20deg' : '-20deg' }] }]} />
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ width: size, height: size, opacity: ghosted ? 0.35 : 1 }}>
      {shielded ? <View style={[styles.shield, { width: size * 1.45, height: size * 1.45, borderRadius: size, left: -size * 0.225, top: -size * 0.225 }]} /> : null}
      <View style={[styles.body, { width: size, height: size, borderRadius: r, backgroundColor: body, borderColor: accent, borderWidth: Math.max(1.5, size * 0.07) }]}>
        {skin.pattern === 'stripes' ? (
          <>
            <View style={[styles.abs, { top: size * 0.62, height: size * 0.1, left: 0, right: 0, backgroundColor: accent }]} />
            <View style={[styles.abs, { top: size * 0.8, height: size * 0.1, left: 0, right: 0, backgroundColor: accent }]} />
          </>
        ) : null}
        {skin.pattern === 'spots' ? (
          <>
            <View style={[styles.abs, { top: size * 0.62, left: size * 0.18, width: size * 0.16, height: size * 0.16, borderRadius: size, backgroundColor: accent }]} />
            <View style={[styles.abs, { top: size * 0.7, left: size * 0.58, width: size * 0.12, height: size * 0.12, borderRadius: size, backgroundColor: accent }]} />
            <View style={[styles.abs, { top: size * 0.12, left: size * 0.66, width: size * 0.1, height: size * 0.1, borderRadius: size, backgroundColor: accent }]} />
          </>
        ) : null}
        {skin.pattern === 'split' ? <View style={[styles.abs, { top: 0, bottom: 0, left: size * 0.46, width: size * 0.54, backgroundColor: accent, opacity: 0.55 }]} /> : null}
        {skin.pattern === 'ring' ? (
          <View style={[styles.abs, { top: size * 0.1, left: size * 0.1, right: size * 0.1, bottom: size * 0.1, borderRadius: size, borderWidth: size * 0.05, borderColor: accent, opacity: 0.7 }]} />
        ) : null}
        {zombie ? (
          <View style={[styles.abs, { top: size * 0.62, left: size * 0.28, width: size * 0.44, height: size * 0.06, backgroundColor: '#3a1010' }]}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ position: 'absolute', left: (i * size * 0.44) / 4 + size * 0.03, top: -size * 0.04, width: size * 0.03, height: size * 0.14, backgroundColor: '#3a1010' }} />
            ))}
          </View>
        ) : null}
      </View>
      {skin.eyes === 'cyclops' ? (
        <View style={[styles.eye, { left: r - eyeSize * 0.7, top: size * 0.26, width: eyeSize * 1.4, height: eyeSize * 1.4, borderRadius: eyeSize, backgroundColor: eyeColor }]}>
          <View style={{ width: eyeSize * 0.6, height: eyeSize * 0.6, borderRadius: eyeSize, backgroundColor: pupil, transform: [{ translateX: lookX }, { translateY: lookY }] }} />
        </View>
      ) : (
        [eye(size * 0.2), eye(size * 0.6)]
      )}
      {skin.accessory ? <Text style={[styles.emoji, { fontSize: size * 0.42, left: size * 0.55, top: -size * 0.22 }]}>{skin.accessory}</Text> : null}
      {outfit ? <Text style={[styles.emoji, { fontSize: size * 0.5, left: size * 0.22, top: -size * 0.42 }]}>{outfit}</Text> : null}
    </View>
  );
}

export const Character = React.memo(CharacterImpl);

const styles = StyleSheet.create({
  body: { overflow: 'hidden', position: 'absolute', left: 0, top: 0 },
  abs: { position: 'absolute' },
  eye: { position: 'absolute', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  brow: { position: 'absolute' },
  emoji: { position: 'absolute', textAlign: 'center' },
  shield: { position: 'absolute', borderWidth: 3, borderColor: 'rgba(111, 200, 255, 0.9)', backgroundColor: 'rgba(111, 200, 255, 0.15)' },
});
