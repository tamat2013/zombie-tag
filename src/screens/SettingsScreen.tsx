// Audio settings: music and effects volume, footsteps, vibration and a mute-all switch.
import { useDevice } from '../utils/device';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Screen, ScreenHeader, Card, P } from '../components/ui';
import { LanguagePicker } from '../components/LanguagePicker';
import { VOLUME_STEPS } from '../logic/soundSettings';
import { playSfx, updateSoundSettings, useSoundSettings } from '../services/sound';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

export function SettingsScreen() {
  const { isDesktop } = useDevice();
  const s = useSoundSettings();
  return (
    <Screen scroll shell="Settings">
      <ScreenHeader title="Settings" />

      <View style={isDesktop ? { flexDirection: 'row', gap: 24, alignItems: 'flex-start' } : undefined}>
      <View style={isDesktop ? { flex: 1 } : undefined}>
      <Card>
        <View style={styles.row}>
          <Icon name="earth" size={24} color={colors.blue} />
          <Text style={styles.title}>Language</Text>
        </View>
        <LanguagePicker />
      </Card>

      <Card style={styles.card}>
        <Toggle icon={s.muted ? 'volume-off' : 'volume-high'} title="Mute all" subtitle="Turns off music and effects without losing your volume levels" value={s.muted} onChange={(muted) => updateSoundSettings({ muted })} />
      </Card>

      </View>
      <View style={isDesktop ? { flex: 1 } : undefined}>
      <Card style={[styles.card, isDesktop && { marginTop: 0 }]}>
        <Volume icon="music" title="Music" value={s.music} disabled={s.muted} onChange={(music) => updateSoundSettings({ music })} />
        <View style={styles.divider} />
        <Volume
          icon="flash"
          title="Sound effects"
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
          icon="shoe-print"
          title="Footsteps"
          subtitle="Your steps and the zombies' steps"
          value={s.footsteps}
          onChange={(footsteps) => {
            updateSoundSettings({ footsteps });
            if (footsteps) playSfx('step1');
          }}
        />
        <View style={styles.divider} />
        <Toggle
          icon="vibrate"
          title="Vibration"
          subtitle="Vibrate when bitten, curing or using an ability"
          value={s.vibration}
          onChange={(vibration) => {
            updateSoundSettings({ vibration });
            haptic('medium');
          }}
        />
      </Card>

      <Text style={styles.testTitle}>Try sounds</Text>
      <View style={styles.testRow}>
        {(
          [
            ['skull-outline', 'groan', 'Groan'],
            ['tooth-outline', 'bite', 'Bite'],
            ['medical-bag', 'heal', 'Heal'],
            ['circle-slice-8', 'stoneHit', 'Stone'],
            ['heart-pulse', 'heartbeat', 'Heartbeat'],
            ['alarm-light-outline', 'released', 'Alarm'],
          ] as const
        ).map(([icon, id, label]) => (
          <Pressable key={id} onPress={() => playSfx(id)} style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.6 }]}>
            <Icon name={icon} size={26} color={colors.text} />
            <Text style={styles.testLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      </View>
      </View>
      <P dim style={{ textAlign: 'center', marginTop: 10 }}>
        Settings are saved on this device.
      </P>
    </Screen>
  );
}

function Toggle({ icon, title, subtitle, value, onChange }: { icon: IconName; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={22} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value ? { right: 2 } : { left: 2 }]} />
      </View>
    </Pressable>
  );
}

function Volume({ icon, title, value, disabled, onChange }: { icon: IconName; title: string; value: number; disabled?: boolean; onChange: (v: number) => void }) {
  const level = Math.round(value * VOLUME_STEPS);
  return (
    <View style={[styles.volume, disabled && { opacity: 0.45 }]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
        <Icon name={icon} size={22} color={colors.ink} />
      </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.toxic, alignItems: 'center', justifyContent: 'center' },
  testLabel: { color: colors.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'left' },
  subtitle: { color: colors.textDim, fontSize: 12, textAlign: 'left', marginTop: 2 },
  percent: { color: colors.toxic, fontWeight: '800', fontSize: 14, minWidth: 44, textAlign: 'left' },
  switch: { width: 54, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.35)' },
  switchOn: { backgroundColor: colors.toxic },
  knob: { position: 'absolute', top: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text },
  volume: { gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 40 },
  barHit: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 40 },
  bar: { width: '70%', borderRadius: 3, backgroundColor: colors.panelLight },
  barOn: { backgroundColor: colors.toxic },
  step: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  testTitle: { color: colors.textDim, fontWeight: '700', textAlign: 'left', marginTop: 18, marginBottom: 8 },
  testRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  testBtn: { width: 76, height: 66, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
