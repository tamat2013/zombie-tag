// Audio and language settings: music and effects volume, footsteps, vibration, a mute-all switch and the language. The phone splits them into tabs; the desktop shows them side by side.
import { useDevice } from '../utils/device';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Card, P, Screen, ScreenHeader, Tabs } from '../components/ui';
import { LanguagePicker } from '../components/LanguagePicker';
import { VOLUME_STEPS } from '../logic/soundSettings';
import { playSfx, updateSoundSettings, useSoundSettings } from '../services/sound';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

type Tab = 'sound' | 'effects' | 'language';

const TESTS = [
  ['skull-outline', 'groan', 'Groan'],
  ['tooth-outline', 'bite', 'Bite'],
  ['medical-bag', 'heal', 'Heal'],
  ['circle-slice-8', 'stoneHit', 'Stone'],
  ['heart-pulse', 'heartbeat', 'Heartbeat'],
  ['alarm-light-outline', 'released', 'Alarm'],
] as const;

export function SettingsScreen() {
  const { isDesktop } = useDevice();
  const s = useSoundSettings();
  const [tab, setTab] = useState<Tab>('sound');

  const mute = (
    <Toggle icon={s.muted ? 'volume-off' : 'volume-high'} title="Mute all" subtitle="Turns off music and effects without losing your volume levels" value={s.muted} onChange={(muted) => updateSoundSettings({ muted })} />
  );

  const volumes = (
    <View style={styles.stack}>
      <Volume icon="music" title="Music" value={s.music} disabled={s.muted} onChange={(music) => updateSoundSettings({ music })} />
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
    </View>
  );

  const footsteps = (
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
  );

  const vibration = (
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
  );

  const tests = (
    <View style={[styles.testRow, isDesktop && styles.grow]}>
      {TESTS.map(([icon, id, label]) => (
        <Pressable
          key={id}
          onPress={() => playSfx(id)}
          accessibilityLabel={label}
          style={({ pressed }) => [styles.testBtn, isDesktop ? styles.testBtnDesk : styles.testBtnPhone, pressed && { opacity: 0.6 }]}
        >
          <Icon name={icon} size={isDesktop ? 30 : 20} color={colors.text} />
          <Text style={styles.testLabel}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const language = (
    <Card style={styles.grow}>
      {isDesktop ? (
        <View style={styles.head}>
          <Icon name="earth" size={22} color={colors.blue} />
          <Text style={styles.cardTitle}>Language</Text>
        </View>
      ) : null}
      <LanguagePicker compact={!isDesktop} />
      <P dim style={styles.note}>
        Settings are saved on this device.
      </P>
    </Card>
  );

  if (!isDesktop) {
    return (
      <Screen shell="Settings">
        <ScreenHeader title="Settings" />
        <Tabs<Tab>
          tabs={[
            { id: 'sound', label: 'Sound' },
            { id: 'effects', label: 'Effects' },
            { id: 'language', label: 'Language' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={styles.listing}>
          {tab === 'sound' ? (
            <View style={styles.pair}>
              <Card style={styles.mute}>{mute}</Card>
              <Card style={styles.fill}>{volumes}</Card>
            </View>
          ) : tab === 'effects' ? (
            <View style={styles.stack}>
              <View style={[styles.pair, styles.grow]}>
                <Card style={styles.fill}>{footsteps}</Card>
                <Card style={styles.fill}>{vibration}</Card>
              </View>
              {tests}
            </View>
          ) : (
            language
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen shell="Settings">
      <ScreenHeader title="Settings" />
      <View style={styles.desk}>
        <View style={styles.deskLeft}>
          <Card>
            {mute}
            <View style={styles.divider} />
            {volumes}
          </Card>
          {language}
        </View>
        <View style={styles.deskRight}>
          <Card>
            {footsteps}
            <View style={styles.divider} />
            {vibration}
          </Card>
          <Card style={styles.grow}>
            <Text style={styles.cardTitle}>Try sounds</Text>
            {tests}
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function Toggle({ icon, title, subtitle, value, onChange }: { icon: IconName; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={20} color={colors.ink} />
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
    <View style={[styles.volume, disabled && styles.faded]}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={20} color={colors.ink} />
      </View>
      <Text style={styles.volumeTitle} numberOfLines={1}>
        {title}
      </Text>
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
      <Text style={styles.percent}>{level * 10}%</Text>
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
  listing: { flex: 1 },
  stack: { flex: 1, gap: 10 },
  pair: { flex: 1, flexDirection: 'row', gap: 10 },
  mute: { width: 300, justifyContent: 'center' },
  fill: { flex: 1, justifyContent: 'center' },
  grow: { flex: 1 },
  desk: { flex: 1, flexDirection: 'row', gap: 28 },
  deskLeft: { width: 460, gap: 14 },
  deskRight: { flex: 1, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'left', marginBottom: 10 },
  note: { textAlign: 'center', marginTop: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.toxic, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'left' },
  subtitle: { color: colors.textDim, fontSize: 12, textAlign: 'left', marginTop: 2 },
  switch: { width: 54, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.35)' },
  switchOn: { backgroundColor: colors.toxic },
  knob: { position: 'absolute', top: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text },
  volume: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 },
  volumeTitle: { width: 118, color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'left' },
  percent: { width: 44, color: colors.toxic, fontWeight: '800', fontSize: 14, textAlign: 'left' },
  faded: { opacity: 0.45 },
  barTrack: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 40 },
  barHit: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 40 },
  bar: { width: '70%', borderRadius: 3, backgroundColor: colors.panelLight },
  barOn: { backgroundColor: colors.toxic },
  step: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  testRow: { flexDirection: 'row', gap: 10 },
  testBtn: { flex: 1, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  testBtnPhone: { height: 40, flexDirection: 'row', gap: 6 },
  testBtnDesk: { gap: 8 },
  testLabel: { color: colors.textDim, fontSize: 11, fontWeight: '800' },
});
