// Daily and weekly missions with progress, rewards and reset countdowns. The phone shows one period at a time; the desktop shows both side by side.
import { useDevice } from '../utils/device';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Card, Grid, H, P, ProgressBar, Screen, ScreenHeader, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { useGame, useProfile } from '../state/GameContext';
import { claimMission, currentMissions, isClaimed, missionProgress, nextDailyReset, nextWeeklyReset } from '../logic/missions';
import type { MissionDef, MissionPeriod } from '../logic/missions';
import { Icon, Glyph } from '../components/Icon';
import { colors } from '../theme';
import { haptic } from '../utils/haptics';

type Board = { period: MissionPeriod; title: string; glyph: 'weather-sunny' | 'calendar-week'; list: MissionDef[]; resetIn: number };

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function MissionsScreen() {
  const { isDesktop } = useDevice();
  const now = useNow();
  const { daily, weekly } = currentMissions(now);
  const [shown, setShown] = useState<MissionPeriod>('daily');
  const boards: Board[] = [
    { period: 'daily', title: 'Daily missions', glyph: 'weather-sunny', list: daily, resetIn: nextDailyReset(now) - now },
    { period: 'weekly', title: 'Weekly missions', glyph: 'calendar-week', list: weekly, resetIn: nextWeeklyReset(now) - now },
  ];

  if (isDesktop) {
    return (
      <Screen shell="Missions">
        <ScreenHeader title="Missions" />
        <View style={styles.deskBoards}>
          {boards.map((b) => (
            <View key={b.period} style={styles.deskBoard}>
              <View style={styles.boardHead}>
                <View style={styles.titleRow}>
                  <Icon name={b.glyph} size={22} color={colors.gold} />
                  <H size={20}>{b.title}</H>
                </View>
                <Reset ms={b.resetIn} />
              </View>
              <View style={styles.deskList}>
                {b.list.map((m) => (
                  <MissionCard key={m.id} mission={m} period={b.period} />
                ))}
              </View>
            </View>
          ))}
        </View>
        <P dim style={styles.note}>
          Progress counts in every mode — Classic, Tournaments, Obstacle Course and Training.
        </P>
      </Screen>
    );
  }

  const active = boards.find((b) => b.period === shown) ?? boards[0];
  return (
    <Screen shell="Missions">
      <ScreenHeader title="Missions" />
      <View style={styles.phoneBar}>
        <Tabs<MissionPeriod>
          tabs={[
            { id: 'daily', label: 'Daily' },
            { id: 'weekly', label: 'Weekly' },
          ]}
          value={shown}
          onChange={setShown}
        />
        <Reset ms={active.resetIn} />
      </View>
      <Grid items={active.list} minWidth={300} minHeight={60} gap={8} paged renderItem={(m) => <MissionCard mission={m} period={active.period} compact />} />
    </Screen>
  );
}

function Reset({ ms }: { ms: number }) {
  return (
    <View style={styles.resetRow}>
      <Icon name="timer-sand" size={16} color={colors.textDim} />
      <Text style={styles.reset}>{countdown(ms)}</Text>
    </View>
  );
}

function MissionCard({ mission: m, period, compact = false }: { mission: MissionDef; period: MissionPeriod; compact?: boolean }) {
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const prog = missionProgress(profile, m, period);
  const claimed = isClaimed(profile, m, period);
  const done = prog >= m.target;

  const claim = () => {
    const next = claimMission(profile, m, period);
    if (!next) return;
    updateProfile(next);
    haptic('success');
    toast(`+${m.coins} coins · +${m.xp} XP`, { icon: m.icon, tone: 'good' });
  };

  return (
    <Card style={[styles.card, compact && styles.cardPhone, claimed && { opacity: 0.55 }]} highlight={done && !claimed ? colors.toxic : undefined}>
      <Glyph emoji={m.icon} size={compact ? 24 : 30} color={colors.gold} />
      <View style={styles.body}>
        <H size={compact ? 14 : 15}>{m.title}</H>
        <ProgressBar value={prog / m.target} color={done ? colors.toxic : colors.blue} height={compact ? 6 : 8} />
        <View style={styles.meta}>
          <Text style={styles.reward}>
            +{m.coins} coins · +{m.xp} XP
          </Text>
          <Text style={styles.count}>
            {prog}/{m.target}
          </Text>
        </View>
      </View>
      {claimed ? (
        <View style={styles.claimed}>
          <Icon name="check-circle" size={compact ? 24 : 30} color={colors.toxic} />
        </View>
      ) : (
        <Button small title="Claim" variant="gold" disabled={!done} onPress={claim} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  deskBoards: { flex: 1, flexDirection: 'row', gap: 24 },
  deskBoard: { flex: 1, gap: 12 },
  deskList: { flex: 1, gap: 12 },
  boardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  resetRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reset: { color: colors.textDim, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { marginTop: 14, textAlign: 'center' },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardPhone: { paddingVertical: 4, paddingHorizontal: 8, gap: 8, borderBottomWidth: 4 },
  body: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  reward: { color: colors.coin, fontWeight: '800', fontSize: 12 },
  count: { color: colors.textDim, fontWeight: '800', fontSize: 12 },
  claimed: { width: 50, alignItems: 'center' },
});
