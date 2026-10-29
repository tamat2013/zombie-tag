// Floating virtual joystick. Writes a normalized vector into `output` (no re-renders per move).
import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet } from 'react-native';
import { View } from 'react-native';
import type { MoveInput } from '../engine/GameEngine';

const BASE = 120;
const KNOB = 54;

export function Joystick({ output, size = BASE }: { output: React.MutableRefObject<MoveInput>; size?: number }) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });
  const max = size / 2;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        originRef.current = { x: locationX, y: locationY };
        setOrigin({ x: locationX, y: locationY });
        setKnob({ x: 0, y: 0 });
      },
      onPanResponderMove: (_e, g) => {
        let dx = g.dx;
        let dy = g.dy;
        const d = Math.hypot(dx, dy);
        if (d > max) {
          dx = (dx / d) * max;
          dy = (dy / d) * max;
        }
        setKnob({ x: dx, y: dy });
        output.current = { x: dx / max, y: dy / max };
      },
      onPanResponderRelease: () => {
        output.current = { x: 0, y: 0 };
        setOrigin(null);
      },
      onPanResponderTerminate: () => {
        output.current = { x: 0, y: 0 };
        setOrigin(null);
      },
    }),
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
      {origin ? (
        <View pointerEvents="none" style={[styles.base, { width: size, height: size, borderRadius: size / 2, left: origin.x - size / 2, top: origin.y - size / 2 }]}>
          <View style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
        </View>
      ) : (
        <View pointerEvents="none" style={[styles.hint, { width: size, height: size, borderRadius: size / 2 }]}>
          <View style={[styles.knob, { opacity: 0.4 }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: 40, bottom: 30, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
});
