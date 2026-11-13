// Global leaderboard: the best players ranked by XP, wins, infections or tasks. Online it reads the shared
// Firestore board; offline it shows simulated players so the screen is never empty.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { useFocusEffect } from '@react-navigation/native';
import type { ScreenProps } from '../navigation/types';
import { Grid, P, Screen, ScreenHeader, Tabs } from '../components/ui';
import { useProfile } from '../state/GameContext';
import { authService } from '../services/authService';
import { leaderboardService } from '../services/leaderboardService';
import type { BoardMetric, BoardView } from '../logic/leaderboard';
import { StandingRow } from './TournamentsScreen';
import type { Placed } from './TournamentsScreen';
import { colors } from '../theme';

const TABS: { id: BoardMetric; label: string }[] = [
  { id: 'xp', label: 'XP' },
  { id: 'wins', label: 'Wins' },
  { id: 'infections', label: 'Infections' },
  { id: 'tasks', label: 'Tasks' },
];

export function LeaderboardScreen(_: ScreenProps<'Leaderboard'>) {
  const profile = useProfile();
  const [metric, setMetric] = useState<BoardMetric>('xp');
  const [boards, setBoards] = useState<Partial<Record<BoardMetric, BoardView | 'loading'>>>({});
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const load = useCallback((m: BoardMetric) => {
    setBoards((b) => ({ ...b, [m]: b[m] ?? 'loading' }));
    leaderboardService.load(m, profileRef.current).then((view) => setBoards((b) => ({ ...b, [m]: view })));
  }, []);

  // Fetched when a tab comes on screen, and again each time this screen is focused (scores change while playing).
  useFocusEffect(useCallback(() => load(metric), [load, metric]));
  // The local player's own numbers change without a refocus (e.g. a profile save), so refresh when they do.
  useEffect(() => {
    if (boards[metric] && boards[metric] !== 'loading') load(metric);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.xp, profile.stats.wins]);

  const view = boards[metric];
  const body = () => {
    if (!view || view === 'loading') {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.toxic} />
        </View>
      );
    }
    if (view.rows.length === 0) {
      return (
        <View style={styles.center}>
          <P dim style={{ textAlign: 'center' }}>
            No players yet. Be the first!
          </P>
        </View>
      );
    }
    const placed: Placed[] = view.rows.map((e) => ({ uid: e.uid, name: e.name, points: e[metric], rank: e.rank }));
    return <Grid items={placed} minWidth={300} minHeight={34} gap={6} paged renderItem={(e) => <StandingRow entry={e} own={e.uid === profile.uid} />} />;
  };

  return (
    <Screen>
      <ScreenHeader title="Leaderboard" />
      <View style={styles.main}>
        <Tabs<BoardMetric> tabs={TABS} value={metric} onChange={setMetric} />
        {view && view !== 'loading' && view.ownRank > 0 ? <Text style={styles.you}>{`Your rank: #${view.ownRank}`}</Text> : null}
        {!authService.isOnline ? <Text style={styles.note}>Offline: these are simulated players</Text> : null}
        <View style={styles.listing}>{body()}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, gap: 8 },
  listing: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  you: { color: colors.toxic, fontWeight: '800', fontSize: 13, textAlign: 'left' },
  note: { color: colors.textMuted, fontSize: 12, textAlign: 'left' },
});
