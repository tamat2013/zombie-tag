// In-game top HUD. Phone: compact two-row bar. Desktop: one wide bar with a timer in the middle and labelled stat chips.
import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { colors, radius } from '../theme';

export type HudProps = {
  isDesktop: boolean;
  timeText: string;
  urgent: boolean;
  role: 'zombie' | 'survivor';
  roleLabel: string;
  obstacle: boolean;
  deaths: number;
  medalTimes?: [number, number, number];
  survivors: number;
  zombies: number;
  tasks: number;
  taskTotal: number;
  muted: boolean;
  onMute: () => void;
  onExit: () => void;
  /** Map toggle / minimap node shown at the left edge. */
  left: React.ReactNode;
};

function Stat({ icon, value, color }: { icon: IconName; value: string; color: string }) {
  return (
    <View style={s.stat}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[s.statText, { color }]}>{value}</Text>
    </View>
  );
}

export function RoundButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label?: string }) {
  return (
    <Pressable style={({ pressed }) => [s.round, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityLabel={label}>
      <Icon name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

export function Hud(p: HudProps) {
  const roleColor = p.role === 'zombie' ? colors.zombie : colors.survivor;
  return (
    <View style={[s.bar, p.isDesktop && s.barDesk]} pointerEvents="box-none">
      <View style={s.side} pointerEvents="box-none">
        {p.left}
      </View>
      <View style={s.center} pointerEvents="none">
        <View style={[s.timerPill, p.urgent && { borderColor: colors.blood }]}>
          <Icon name="timer-outline" size={p.isDesktop ? 24 : 20} color={p.urgent ? colors.blood : colors.toxic} />
          <Text style={[s.timer, p.isDesktop && { fontSize: 32 }, p.urgent && { color: colors.blood }]}>{p.timeText}</Text>
        </View>
        <View style={s.stats}>
          {p.obstacle ? (
            <>
              <Stat icon="skull-outline" value={`${p.deaths}`} color={colors.textDim} />
              {p.medalTimes
                ? (['#ffd23f', '#d6dbe6', '#d98a4a'] as const).map((c, i) => <Stat key={i} icon="medal" value={`${p.medalTimes![i]}s`} color={c} />)
                : null}
            </>
          ) : (
            <>
              <Stat icon="run" value={`${p.survivors}`} color={colors.survivor} />
              <Stat icon="virus" value={`${p.zombies}`} color={colors.zombie} />
              <Stat icon="wrench" value={`${p.tasks}/${p.taskTotal}`} color={colors.gold} />
            </>
          )}
        </View>
        <View style={[s.rolePill, { backgroundColor: roleColor }]}>
          <Text style={s.roleText}>{p.roleLabel}</Text>
        </View>
      </View>
      <View style={[s.side, { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }]}>
        <RoundButton icon={p.muted ? 'volume-off' : 'volume-high'} onPress={p.onMute} label={p.muted ? 'Unmute' : 'Mute'} />
        <RoundButton icon="close" onPress={p.onExit} label="Exit" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  barDesk: { top: 16, left: 24, right: 24 },
  side: { flex: 1, alignItems: 'flex-start' },
  center: { alignItems: 'center', gap: 6 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(13,10,31,0.72)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)' },
  timer: { color: colors.toxic, fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', gap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(13,10,31,0.6)', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3 },
  statText: { fontWeight: '900', fontSize: 13 },
  rolePill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  roleText: { color: colors.ink, fontWeight: '900', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(13,10,31,0.72)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
