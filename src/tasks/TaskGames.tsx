// The five survivor mini-games. Each calls onComplete() when solved.
// `speed` is the task-speed multiplier from upgrades (1 = base).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { Pressable, View } from 'react-native';
import { Text } from '../i18n/Text';
import type { TaskType } from '../types';
import { colors } from '../theme';
import { haptic } from '../utils/haptics';
import { ProgressBar } from '../components/ui';

export interface TaskProps {
  onComplete: () => void;
  speed: number;
}

export const TASK_INFO: Record<TaskType, { title: string; icon: string; hint: string }> = {
  wires: { title: 'Connect Wires', icon: '🔌', hint: 'Tap a wire on the left, then the wire of the same color on the right' },
  machine: { title: 'Fix the Machine', icon: '🛠️', hint: 'Stop the needle in the green zone 3 times' },
  download: { title: 'Download Data', icon: '💾', hint: 'Start the download and stay until it finishes' },
  trash: { title: 'Empty the Trash', icon: '🗑️', hint: 'Hold the lever down until the bin is empty' },
  temperature: { title: 'Check Temperature', icon: '🌡️', hint: 'Set the temperature exactly to the target' },
};

// ---------------------------------------------------------------------------------------------

const WIRE_COLORS = ['#ef4444', '#3b82f6', '#facc15', '#22c55e'];
const ROW_H = 46;
const PANEL_W = 260;

export function WiresTask({ onComplete }: TaskProps) {
  const right = useMemo(() => [...WIRE_COLORS].sort(() => Math.random() - 0.5), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [links, setLinks] = useState<Record<number, number>>({});
  const [wrong, setWrong] = useState<number | null>(null);

  useEffect(() => {
    if (Object.keys(links).length === WIRE_COLORS.length) {
      const t = setTimeout(onComplete, 350);
      return () => clearTimeout(t);
    }
  }, [links, onComplete]);

  const tapRight = (ri: number) => {
    if (selected === null || Object.values(links).includes(ri)) return;
    if (right[ri] === WIRE_COLORS[selected]) {
      haptic('light');
      setLinks((l) => ({ ...l, [selected]: ri }));
      setSelected(null);
    } else {
      haptic('error');
      setWrong(ri);
      setTimeout(() => setWrong(null), 300);
    }
  };

  return (
    <View style={{ width: PANEL_W, height: ROW_H * 4 + 10 }}>
      {Object.entries(links).map(([li, ri]) => {
        const y1 = Number(li) * ROW_H + ROW_H / 2;
        const y2 = ri * ROW_H + ROW_H / 2;
        const x1 = 46;
        const x2 = PANEL_W - 46;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        return (
          <View
            key={li}
            style={{
              position: 'absolute',
              left: (x1 + x2) / 2 - len / 2,
              top: (y1 + y2) / 2 - 4,
              width: len,
              height: 8,
              borderRadius: 4,
              backgroundColor: WIRE_COLORS[Number(li)],
              transform: [{ rotate: `${ang}rad` }],
            }}
          />
        );
      })}
      {WIRE_COLORS.map((c, i) => (
        <Pressable
          key={`l${i}`}
          testID={`wire-l-${i}`}
          onPress={() => links[i] === undefined && setSelected(i)}
          style={[styles.wireEnd, { left: 0, top: i * ROW_H, backgroundColor: c, borderColor: selected === i ? '#fff' : '#111' }]}
        />
      ))}
      {right.map((c, i) => (
        <Pressable
          key={`r${i}`}
          testID={`wire-r-${WIRE_COLORS.indexOf(c)}`}
          onPress={() => tapRight(i)}
          style={[styles.wireEnd, { right: 0, top: i * ROW_H, backgroundColor: c, borderColor: wrong === i ? colors.blood : '#111' }]}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

export function MachineTask({ onComplete, speed }: TaskProps) {
  const [hits, setHits] = useState(0);
  const [zone, setZone] = useState(() => 0.25 + Math.random() * 0.5);
  const pos = useRef(new Animated.Value(0)).current;
  const value = useRef(0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const zoneWidth = 0.16 * Math.min(1.6, speed);

  useEffect(() => {
    const id = pos.addListener(({ value: v }) => (value.current = v));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pos, { toValue: 1, duration: 900 - hits * 120, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pos, { toValue: 0, duration: 900 - hits * 120, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pos.removeListener(id);
    };
  }, [pos, hits]);

  const stop = () => {
    const v = value.current;
    if (Math.abs(v - zone) <= zoneWidth / 2) {
      haptic('medium');
      setFlash('good');
      const next = hits + 1;
      setHits(next);
      setZone(0.2 + Math.random() * 0.6);
      if (next >= 3) setTimeout(onComplete, 250);
    } else {
      haptic('error');
      setFlash('bad');
      setHits(0);
    }
    setTimeout(() => setFlash(null), 250);
  };

  return (
    <View style={{ width: 300, alignItems: 'center' }}>
      <View style={styles.gears}>
        {[0, 1, 2].map((i) => (
          <Text key={i} style={{ fontSize: 30, opacity: i < hits ? 1 : 0.25 }}>
            ⚙️
          </Text>
        ))}
      </View>
      <View style={[styles.track, flash === 'good' && { borderColor: colors.toxic }, flash === 'bad' && { borderColor: colors.blood }]}>
        <View testID="machine-zone" style={[styles.zone, { left: `${(zone - zoneWidth / 2) * 100}%`, width: `${zoneWidth * 100}%` }]} />
        <Animated.View testID="machine-needle" style={[styles.needle, { left: pos.interpolate({ inputRange: [0, 1], outputRange: ['0%', '98%'] }) }]} />
      </View>
      <Pressable testID="machine-stop" onPress={stop} style={({ pressed }) => [styles.bigBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Text style={styles.bigBtnText}>STOP!</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

const FILES = ['research_data.db', 'shelter_map.map', 'lab_journal.log', 'vaccine_v2.dat'];

export function DownloadTask({ onComplete, speed }: TaskProps) {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const duration = 6000 / speed;

  useEffect(() => {
    if (!started) return;
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        setTimeout(onComplete, 300);
      }
    }, 80);
    return () => clearInterval(id);
  }, [started, duration, onComplete]);

  const fileIndex = Math.min(FILES.length - 1, Math.floor(progress * FILES.length));
  return (
    <View style={{ width: 300, alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 46 }}>{started ? (progress >= 1 ? '✅' : '📥') : '🖥️'}</Text>
      {started ? (
        <>
          <Text style={styles.mono}>{progress >= 1 ? 'Download complete' : `Downloading: ${FILES[fileIndex]}`}</Text>
          <ProgressBar value={progress} height={16} style={{ width: '100%' }} color={colors.survivor} />
          <Text style={styles.mono}>{Math.floor(progress * 100)}%</Text>
        </>
      ) : (
        <Pressable testID="download-start" onPress={() => setStarted(true)} style={({ pressed }) => [styles.bigBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Text style={styles.bigBtnText}>Start download</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

export function TrashTask({ onComplete, speed }: TaskProps) {
  const [level, setLevel] = useState(1);
  const holding = useRef(false);
  const lever = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!holding.current || done.current) return;
      setLevel((l) => {
        const next = Math.max(0, l - 0.035 * speed);
        if (next <= 0 && !done.current) {
          done.current = true;
          haptic('success');
          setTimeout(onComplete, 300);
        }
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [speed, onComplete]);

  const press = (v: boolean) => {
    holding.current = v;
    Animated.spring(lever, { toValue: v ? 1 : 0, useNativeDriver: true }).start();
    if (v) haptic('light');
  };

  return (
    <View style={{ width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
      <View style={styles.bin}>
        <View style={[styles.binFill, { height: `${level * 100}%` }]}>
          <Text style={{ fontSize: 20, textAlign: 'center' }}>{level > 0.3 ? '🍌🥫🦴' : level > 0 ? '🥫' : ''}</Text>
        </View>
      </View>
      <Pressable testID="trash-lever" onPressIn={() => press(true)} onPressOut={() => press(false)} style={styles.leverSlot}>
        <Animated.View style={[styles.leverKnob, { transform: [{ translateY: lever.interpolate({ inputRange: [0, 1], outputRange: [0, 90] }) }] }]} />
        <Text style={styles.leverLabel}>Hold</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

export function TemperatureTask({ onComplete }: TaskProps) {
  const target = useMemo(() => 18 + Math.floor(Math.random() * 20), []);
  const [temp, setTemp] = useState(() => {
    let t = target;
    while (Math.abs(t - target) < 8) t = 5 + Math.floor(Math.random() * 45);
    return t;
  });
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (temp === target && !finished.current) {
      finished.current = true;
      haptic('success');
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
  }, [temp, target, onComplete]);

  useEffect(() => () => {
    if (repeat.current) clearInterval(repeat.current);
  }, []);

  const startHold = (d: number) => {
    setTemp((t) => Math.max(0, Math.min(60, t + d)));
    repeat.current = setInterval(() => setTemp((t) => Math.max(0, Math.min(60, t + d))), 140);
  };
  const endHold = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };
  const diff = Math.abs(temp - target);
  const color = diff === 0 ? colors.toxic : diff < 4 ? colors.gold : colors.blood;

  return (
    <View style={{ width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.dimLabel}>Target</Text>
        <Text testID="temp-target" style={[styles.tempBig, { color: colors.survivor }]}>{target}°</Text>
      </View>
      <View style={styles.thermo}>
        <View style={[styles.thermoFill, { height: `${(temp / 60) * 100}%`, backgroundColor: color }]} />
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Pressable testID="temp-up" onPressIn={() => startHold(1)} onPressOut={endHold} style={styles.arrowBtn}>
          <Text style={styles.arrow}>▲</Text>
        </Pressable>
        <Text testID="temp-value" style={[styles.tempBig, { color }]}>{temp}°</Text>
        <Pressable testID="temp-down" onPressIn={() => startHold(-1)} onPressOut={endHold} style={styles.arrowBtn}>
          <Text style={styles.arrow}>▼</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const TASK_COMPONENTS: Record<TaskType, React.ComponentType<TaskProps>> = {
  wires: WiresTask,
  machine: MachineTask,
  download: DownloadTask,
  trash: TrashTask,
  temperature: TemperatureTask,
};

const styles = StyleSheet.create({
  wireEnd: { position: 'absolute', width: 46, height: ROW_H - 12, borderRadius: 8, borderWidth: 3 },
  gears: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  track: { width: '100%', height: 34, borderRadius: 10, backgroundColor: '#0a0f09', borderWidth: 2, borderColor: colors.border, overflow: 'hidden' },
  zone: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(124,255,79,0.45)' },
  needle: { position: 'absolute', top: 0, bottom: 0, width: 6, backgroundColor: '#fff' },
  bigBtn: { marginTop: 16, backgroundColor: colors.toxicDark, paddingVertical: 12, paddingHorizontal: 36, borderRadius: 14, borderWidth: 2, borderColor: colors.toxic },
  bigBtnText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  mono: { color: colors.text, fontFamily: 'monospace', fontSize: 14 },
  bin: { width: 90, height: 140, borderWidth: 4, borderColor: '#9ca3af', borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, justifyContent: 'flex-end', overflow: 'hidden' },
  binFill: { backgroundColor: '#6b4f2a', justifyContent: 'flex-start', paddingTop: 4 },
  leverSlot: { width: 60, height: 150, borderRadius: 30, backgroundColor: '#0a0f09', borderWidth: 2, borderColor: colors.border, alignItems: 'center', paddingTop: 6 },
  leverKnob: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.blood, borderWidth: 3, borderColor: '#fff' },
  leverLabel: { position: 'absolute', bottom: -22, color: colors.textDim, fontWeight: '800' },
  dimLabel: { color: colors.textDim, fontWeight: '700' },
  tempBig: { fontSize: 34, fontWeight: '900' },
  thermo: { width: 30, height: 150, borderRadius: 15, backgroundColor: '#0a0f09', borderWidth: 2, borderColor: colors.border, justifyContent: 'flex-end', overflow: 'hidden' },
  thermoFill: { width: '100%' },
  arrowBtn: { width: 54, height: 42, borderRadius: 10, backgroundColor: colors.panelLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  arrow: { color: colors.text, fontSize: 20 },
});
