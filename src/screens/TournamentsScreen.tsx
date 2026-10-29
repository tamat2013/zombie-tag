// Tournament schedule: register, play knockout runs while live, and view the leaderboard.
// Knockout prizes are paid right after a run ends, so there is nothing to claim here.
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import { Screen, ScreenHeader, Card, H, P, Pill } from '../components/ui';
import { Button } from '../components/Button';
import { useGame, useProfile } from '../state/GameContext';
import { CHAMPION_POINTS, getTournaments, PRIZE_LABELS, rankOf, registerForTournament, tournamentStatus } from '../logic/tournaments';
import type { LeaderboardEntry, Tournament } from '../logic/tournaments';
import { tournamentService } from '../services/tournamentService';
import { useNow } from './MissionsScreen';
import { colors } from '../theme';
import { haptic } from '../utils/haptics';

function timeLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function clock(ms: number): string {
  const d = new Date(ms);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const RANK_ICONS = ['🥇', '🥈', '🥉'];
const PRIZE_ICONS = ['🏆', '🥈', '🥉', '🎟️'];

export function TournamentsScreen({ navigation }: ScreenProps<'Tournaments'>) {
  const now = useNow();
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const [boards, setBoards] = useState<Record<string, LeaderboardEntry[] | 'loading'>>({});
  const [open, setOpen] = useState<string | null>(null);

  const list = getTournaments(now);

  const loadBoard = async (t: Tournament) => {
    setBoards((b) => ({ ...b, [t.id]: 'loading' }));
    const entries = await tournamentService.leaderboard(t, profile, Date.now());
    setBoards((b) => ({ ...b, [t.id]: entries }));
  };

  const toggleBoard = (t: Tournament) => {
    if (open === t.id) return setOpen(null);
    setOpen(t.id);
    loadBoard(t);
  };

  const register = (t: Tournament) => {
    updateProfile((p) => registerForTournament(p, t));
    tournamentService.register(t, profile).catch((e) => console.warn('register failed', e));
    haptic('success');
    toast(`Registered for ${t.name}`, { icon: t.icon, tone: 'good' });
  };

  const play = (t: Tournament) => {
    if (!profile.tournaments[t.id]) register(t);
    navigation.navigate('SkinSelect', { flow: { mode: 'tournament', tournamentId: t.id } });
  };

  const renderCard = (t: Tournament) => {
    const status = tournamentStatus(t, now);
    const entry = profile.tournaments[t.id];
    const board = boards[t.id];
    const statusPill =
      status === 'live' ? (
        <Pill text={`Live · ${timeLeft(t.endsAt - now)} left`} icon="🔴" color={colors.blood} />
      ) : status === 'upcoming' ? (
        <Pill text={`Starts in ${timeLeft(t.startsAt - now)}`} icon="⏳" color={colors.gold} />
      ) : (
        <Pill text="Ended" icon="🏁" color={colors.textDim} />
      );

    return (
      <Card key={t.id} highlight={status === 'live' ? colors.blood : undefined} style={{ gap: 8 }}>
        <View style={styles.head}>
          <Text style={{ fontSize: 36 }}>{t.icon}</Text>
          <View style={{ flex: 1 }}>
            <H size={17}>{t.name}</H>
            <P dim style={{ fontSize: 12 }}>
              {clock(t.startsAt)} – {clock(t.endsAt)}
            </P>
          </View>
          {statusPill}
        </View>
        <P dim>{t.description}</P>

        <View style={styles.prizes}>
          {t.prizes.map((pr, i) => (
            <View key={i} style={styles.prize}>
              <Text style={styles.prizeRank}>{PRIZE_ICONS[i] ?? '🎟️'}</Text>
              <Text style={styles.prizeText}>{pr.coins} 🪙</Text>
              {pr.medals ? <Text style={styles.prizeText}>{pr.medals} 🏅</Text> : null}
              {pr.skin ? <Text style={[styles.prizeText, { color: colors.purple }]}>Skin!</Text> : null}
              <Text style={styles.prizeLabel}>{PRIZE_LABELS[i] ?? 'Participation'}</Text>
            </View>
          ))}
        </View>

        {entry ? (
          <Text style={styles.mine}>
            ✔ Registered · {entry.points} points
          </Text>
        ) : null}

        <View style={styles.actions}>
          {status === 'live' ? <Button small title="Play now" icon="▶️" onPress={() => play(t)} style={{ flex: 1 }} /> : null}
          {status === 'upcoming' && !entry ? <Button small title="Register" icon="📝" variant="blue" onPress={() => register(t)} style={{ flex: 1 }} /> : null}
          <Button small title={open === t.id ? 'Hide board' : 'Leaderboard'} icon="📊" variant="dark" onPress={() => toggleBoard(t)} style={{ flex: 1 }} />
        </View>

        {open === t.id ? (
          <View style={styles.board}>
            {board === 'loading' || !board ? (
              <ActivityIndicator color={colors.toxic} />
            ) : board.length === 0 ? (
              <P dim style={{ textAlign: 'center' }}>No players yet. Be the first!</P>
            ) : (
              board.slice(0, 10).map((e, i) => (
                <View key={e.uid} style={[styles.boardRow, e.uid === profile.uid && styles.boardMine]}>
                  <Text style={styles.boardRank}>{i < 3 ? RANK_ICONS[i] : i + 1}</Text>
                  <Text style={[styles.boardName, e.uid === profile.uid && { color: colors.toxic }]} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text style={styles.boardPts}>{e.points}</Text>
                </View>
              ))
            )}
            {Array.isArray(board) && entry && rankOf(board, profile.uid) > 10 ? (
              <Text style={styles.mine}>Your rank: {rankOf(board, profile.uid)}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    );
  };

  const live = list.filter((t) => tournamentStatus(t, now) === 'live');
  const upcoming = list.filter((t) => tournamentStatus(t, now) === 'upcoming');
  const ended = list.filter((t) => tournamentStatus(t, now) === 'ended');

  return (
    <Screen scroll>
      <ScreenHeader title="Tournaments" />
      <Card style={{ marginBottom: 6 }}>
        <P dim>
          Knockout tournament: 8 players, half zombies and half survivors. You advance only if the team you started on wins, all the way to a 2-player final. In tournaments survivors are faster and zombies are slower.
          You get your prize as soon as your run ends. Every match also earns leaderboard points (win 100, task 10, infection 15, champion +{CHAMPION_POINTS}).
        </P>
      </Card>
      {live.length ? (
        <H size={16} style={styles.section}>
          🔴 Live now
        </H>
      ) : null}
      <View style={{ gap: 10 }}>{live.map(renderCard)}</View>
      <H size={16} style={styles.section}>
        ⏳ Upcoming
      </H>
      <View style={{ gap: 10 }}>{upcoming.map(renderCard)}</View>
      {ended.length ? (
        <H size={16} style={styles.section}>
          🏁 Ended
        </H>
      ) : null}
      <View style={{ gap: 10 }}>{ended.map(renderCard)}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: { marginTop: 16, marginBottom: 8 },
  prizes: { flexDirection: 'row', gap: 6 },
  prize: { flex: 1, backgroundColor: colors.bgAlt, borderRadius: 10, padding: 6, alignItems: 'center' },
  prizeRank: { fontSize: 20 },
  prizeText: { color: colors.coin, fontWeight: '800', fontSize: 12 },
  prizeLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  mine: { color: colors.toxic, fontWeight: '800', textAlign: 'left' },
  actions: { flexDirection: 'row', gap: 8 },
  board: { backgroundColor: colors.bgAlt, borderRadius: 10, padding: 8, gap: 2, minHeight: 40, justifyContent: 'center' },
  boardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 6, borderRadius: 6 },
  boardMine: { backgroundColor: 'rgba(124,255,79,0.1)' },
  boardRank: { width: 30, color: colors.textDim, fontWeight: '900', textAlign: 'center' },
  boardName: { flex: 1, color: colors.text, fontWeight: '700', textAlign: 'left' },
  boardPts: { color: colors.gold, fontWeight: '900', minWidth: 50, textAlign: 'left' },
});
