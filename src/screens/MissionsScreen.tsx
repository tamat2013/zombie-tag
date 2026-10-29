// Daily and weekly missions with progress, rewards and reset countdowns.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../i18n/Text';
import { Screen, ScreenHeader, Card, H, P, ProgressBar } from '../components/ui';
import { Button } from '../components/Button';
import { useGame, useProfile } from '../state/GameContext';
import { claimMission, currentMissions, isClaimed, missionProgress, nextDailyReset, nextWeeklyReset } from '../logic/missions';
import type { MissionDef, MissionPeriod } from '../logic/missions';
import { colors } from '../theme';
import { haptic } from '../utils/haptics';

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
  const now = useNow();
  const { daily, weekly } = currentMissions(now);

  return (
    <Screen scroll>
      <ScreenHeader title="Missions" />
      <Section title="☀️ Daily missions" period="daily" list={daily} resetIn={nextDailyReset(now) - now} />
      <Section title="📅 Weekly missions" period="weekly" list={weekly} resetIn={nextWeeklyReset(now) - now} />
      <P dim style={{ marginTop: 14, textAlign: 'center' }}>
        Progress counts in every mode — Classic, Tournaments, Obstacle Course and Training.
      </P>
    </Screen>
  );
}

function Section({ title, period, list, resetIn }: { title: string; period: MissionPeriod; list: MissionDef[]; resetIn: number }) {
  const profile = useProfile();
  const { updateProfile, toast } = useGame();

  const claim = (m: MissionDef) => {
    const next = claimMission(profile, m, period);
    if (!next) return;
    updateProfile((p) => claimMission(p, m, period) ?? p);
    haptic('success');
    toast(`+${m.coins} 🪙 · +${m.xp} XP`, { icon: m.icon, tone: 'good' });
  };

  return (
    <View style={{ marginTop: 14, gap: 8 }}>
      <View style={styles.sectionHead}>
        <H size={18}>{title}</H>
        <Text style={styles.reset}>⏳ {countdown(resetIn)}</Text>
      </View>
      {list.map((m) => {
        const prog = missionProgress(profile, m, period);
        const claimed = isClaimed(profile, m, period);
        const done = prog >= m.target;
        return (
          <Card key={m.id} style={[styles.row, claimed && { opacity: 0.55 }]} highlight={done && !claimed ? colors.toxic : undefined}>
            <Text style={{ fontSize: 30 }}>{m.icon}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <H size={15}>{m.title}</H>
              <ProgressBar value={prog / m.target} color={done ? colors.toxic : colors.blue} height={8} />
              <View style={styles.meta}>
                <Text style={styles.reward}>
                  🪙 {m.coins} · ⭐ {m.xp} XP
                </Text>
                <Text style={styles.count}>
                  {prog}/{m.target}
                </Text>
              </View>
            </View>
            {claimed ? (
              <Text style={styles.claimed}>✔</Text>
            ) : (
              <Button small title="Claim" variant="gold" disabled={!done} onPress={() => claim(m)} />
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reset: { color: colors.textDim, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  reward: { color: colors.coin, fontWeight: '800', fontSize: 12 },
  count: { color: colors.textDim, fontWeight: '800', fontSize: 12 },
  claimed: { color: colors.toxic, fontSize: 26, fontWeight: '900', width: 50, textAlign: 'center' },
});
