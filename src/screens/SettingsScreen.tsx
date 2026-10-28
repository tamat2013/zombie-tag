// Audio settings: music and effects volume, footsteps, vibration and a mute-all switch.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, ScreenHeader, Card, P } from '../components/ui';
import { VOLUME_STEPS } from '../logic/soundSettings';
import { playSfx, updateSoundSettings, useSoundSettings } from '../services/sound';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

export function SettingsScreen() {
  const s = useSoundSettings();
  return (
    <Screen scroll>
      <ScreenHeader title="הגדרות סאונד" />

      <Card>
        <Toggle icon={s.muted ? '🔇' : '🔊'} title="השתק הכל" subtitle="מכבה מוזיקה ואפקטים בלי לאבד את הווליום שבחרת" value={s.muted} onChange={(muted) => updateSoundSettings({ muted })} />
      </Card>

      <Card style={styles.card}>
        <Volume icon="🎵" title="מוזיקה" value={s.music} disabled={s.muted} onChange={(music) => updateSoundSettings({ music })} />
        <View style={styles.divider} />
        <Volume
          icon="💥"
          title="אפקטים קוליים"
          value={s.sfx}
          disabled={s.muted}
          onChange={(sfx) => {
            updateSoundSettings({ sfx });
            playSfx('click');
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Toggle
          icon="👣"
          title="צלילי הליכה"
          subtitle="צעדים שלך ושל הזומבים"
          value={s.footsteps}
          onChange={(footsteps) => {
            updateSoundSettings({ footsteps });
            if (footsteps) playSfx('step1');
          }}
        />
        <View style={styles.divider} />
        <Toggle
          icon="📳"
          title="רטט"
          subtitle="רטט כשנדבקים, מרפאים ומשתמשים ביכולת"
          value={s.vibration}
          onChange={(vibration) => {
            updateSoundSettings({ vibration });
            haptic('medium');
          }}
        />
      </Card>

      <Text style={styles.testTitle}>נסה צלילים</Text>
      <View style={styles.testRow}>
        {(
          [
            ['🧟', 'groan'],
            ['🦷', 'bite'],
            ['🩺', 'heal'],
            ['🪨', 'stoneHit'],
            ['💓', 'heartbeat'],
            ['🚨', 'released'],
          ] as const
        ).map(([icon, id]) => (
          <Pressable key={id} onPress={() => playSfx(id)} style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.6 }]}>
            <Text style={{ fontSize: 24 }}>{icon}</Text>
          </Pressable>
        ))}
      </View>
      <P dim style={{ textAlign: 'center', marginTop: 10 }}>
        ההגדרות נשמרות במכשיר.
      </P>
    </Screen>
  );
}

function Toggle({ icon, title, subtitle, value, onChange }: { icon: string; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value ? { left: 2 } : { right: 2 }]} />
      </View>
    </Pressable>
  );
}

function Volume({ icon, title, value, disabled, onChange }: { icon: string; title: string; value: number; disabled?: boolean; onChange: (v: number) => void }) {
  const level = Math.round(value * VOLUME_STEPS);
  return (
    <View style={[styles.volume, disabled && { opacity: 0.45 }]}>
      <View style={styles.row}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, { flex: 1 }]}>{title}</Text>
        <Text style={styles.percent}>{level * 10}%</Text>
      </View>
      <View style={styles.bars}>
        <StepBtn label="+" onPress={() => onChange(Math.min(VOLUME_STEPS, level + 1) / VOLUME_STEPS)} />
        {/* Bars fill from the right, matching the Hebrew reading direction. */}
        <View style={styles.barTrack}>
          {Array.from({ length: VOLUME_STEPS }, (_, i) => VOLUME_STEPS - i).map((n) => (
            <Pressable key={n} onPress={() => onChange(n === level ? 0 : n / VOLUME_STEPS)} style={styles.barHit} hitSlop={{ top: 10, bottom: 10 }}>
              <View style={[styles.bar, { height: 10 + n * 2.4 }, n <= level && styles.barOn]} />
            </Pressable>
          ))}
        </View>
        <StepBtn label="−" onPress={() => onChange(Math.max(0, level - 1) / VOLUME_STEPS)} />
      </View>
    </View>
  );
}

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]} hitSlop={6}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, minHeight: 44 },
  icon: { fontSize: 24, width: 32, textAlign: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  subtitle: { color: colors.textDim, fontSize: 12, textAlign: 'right', marginTop: 2 },
  percent: { color: colors.toxic, fontWeight: '800', fontSize: 14, minWidth: 44, textAlign: 'left' },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border },
  switchOn: { backgroundColor: colors.toxicDark, borderColor: colors.toxic },
  knob: { position: 'absolute', top: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text },
  volume: { gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 40 },
  barHit: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 40 },
  bar: { width: '70%', borderRadius: 3, backgroundColor: colors.panelLight },
  barOn: { backgroundColor: colors.toxic },
  step: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  testTitle: { color: colors.textDim, fontWeight: '700', textAlign: 'right', marginTop: 18, marginBottom: 8 },
  testRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  testBtn: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
