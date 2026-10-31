// Tournament schedule: register, play knockout runs while live, and read the leaderboard. The phone opens one tournament at a time; the desktop shows the list beside the leaderboard.
import { useDevice } from '../utils/device';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { useFocusEffect } from '@react-navigation/native';
import type { ScreenProps } from '../navigation/types';
import { Card, Grid, H, P, Pill, Screen, ScreenHeader, Tabs } from '../components/ui';
import { Glyph, Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useGame, useProfile } from '../state/GameContext';
import { CHAMPION_POINTS, getTournaments, PRIZE_LABELS, rankOf, registerForTournament, tournamentStatus } from '../logic/tournaments';
import type { LeaderboardEntry, Tournament } from '../logic/tournaments';
import { tournamentService } from '../services/tournamentService';
import { useNow } from './MissionsScreen';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

type Group = 'live' | 'upcoming' | 'ended';
type Tab = Group | 'rules';
type Detail = 'prizes' | 'board';
type Placed = LeaderboardEntry & { rank: number };

const EMPTY: Record<Group, string> = {
  live: 'No tournament is live right now.',
  upcoming: 'No tournament is scheduled yet.',
  ended: 'No finished tournaments yet.',
};
const PRIZE_ICONS = ['trophy', 'trophy-outline', 'medal-outline', 'ticket-outline'] as const;
const RANK_COLORS = [colors.gold, colors.text, colors.medal];

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

function statusPill(t: Tournament, now: number) {
  const status = tournamentStatus(t, now);
  if (status === 'live') return <Pill text={`Live · ${timeLeft(t.endsAt - now)} left`} lead={<Icon name="record-circle" size={14} color={colors.blood} />} color={colors.blood} />;
  if (status === 'upcoming') return <Pill text={`Starts in ${timeLeft(t.startsAt - now)}`} lead={<Icon name="timer-sand" size={14} color={colors.gold} />} color={colors.gold} />;
  return <Pill text="Ended" lead={<Icon name="flag-checkered" size={14} color={colors.textDim} />} color={colors.textDim} />;
}

function StandingRow({ entry, own }: { entry: Placed; own: boolean }) {
  return (
    <View style={[styles.standing, own && styles.ownRow]}>
      {entry.rank <= 3 ? <Icon name="medal" size={18} color={RANK_COLORS[entry.rank - 1]} /> : <Text style={styles.rank}>{entry.rank}</Text>}
      <Text style={[styles.standingName, own && styles.ownText]} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={styles.points}>{entry.points}</Text>
    </View>
  );
}

export function TournamentsScreen({ navigation }: ScreenProps<'Tournaments'>) {
  const { isDesktop } = useDevice();
  const now = useNow();
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const [boards, setBoards] = useState<Record<string, LeaderboardEntry[] | 'loading'>>({});
  const [tab, setTab] = useState<Tab>('live');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail>('prizes');

  const list = getTournaments(now);
  const groups: Record<Group, Tournament[]> = {
    live: list.filter((t) => tournamentStatus(t, now) === 'live'),
    upcoming: list.filter((t) => tournamentStatus(t, now) === 'upcoming'),
    ended: list.filter((t) => tournamentStatus(t, now) === 'ended'),
  };
  const shown = tab === 'rules' ? [] : groups[tab];
  // The tournament opened from the list; the desktop leaderboard shows it, or the first tournament when none is opened.
  const picked = list.find((t) => t.id === openId);
  const focus = picked ?? groups.live[0] ?? groups.upcoming[0] ?? groups.ended[0];
  const boardShown = isDesktop || (picked !== undefined && detail === 'board');

  const loadBoard = async (t: Tournament) => {
    setBoards((b) => ({ ...b, [t.id]: 'loading' }));
    const entries = await tournamentService.leaderboard(t, profile, Date.now());
    setBoards((b) => ({ ...b, [t.id]: entries }));
  };

  // A leaderboard is fetched when it comes on screen, and again whenever this screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (focus && boardShown) loadBoard(focus);
    }, [focus?.id, boardShown]),
  );

  const open = (t: Tournament) => {
    setOpenId(t.id);
    setDetail('prizes');
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

  const action = (t: Tournament, grow = false) => {
    const style = grow ? styles.grow : undefined;
    const status = tournamentStatus(t, now);
    if (status === 'live') return <Button small title="Play now" lead={<Icon name="play" size={16} color={colors.ink} />} onPress={() => play(t)} style={style} />;
    if (status === 'upcoming' && !profile.tournaments[t.id]) {
      return <Button small title="Register" lead={<Icon name="pencil-outline" size={16} color={colors.ink} />} variant="blue" onPress={() => register(t)} style={style} />;
    }
    return null;
  };

  const standings = (t: Tournament) => {
    const board = boards[t.id];
    if (!board || board === 'loading') {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.toxic} />
        </View>
      );
    }
    if (board.length === 0) {
      return (
        <View style={styles.center}>
          <P dim style={{ textAlign: 'center' }}>
            No players yet. Be the first!
          </P>
        </View>
      );
    }
    const placed: Placed[] = board.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }));
    const own = board.find((e) => e.uid === profile.uid);
    const ownRank = rankOf(board, profile.uid);
    if (own && profile.tournaments[t.id] && ownRank > 10) placed.push({ ...own, rank: ownRank });
    return <Grid items={placed} minWidth={300} minHeight={30} gap={6} paged renderItem={(e) => <StandingRow entry={e} own={e.uid === profile.uid} />} />;
  };

  const prizes = (t: Tournament) => (
    <View style={styles.prizes}>
      {t.prizes.map((pr, i) => (
        <View key={i} style={styles.prize}>
          <View style={styles.prizeHead}>
            <Icon name={PRIZE_ICONS[i] ?? 'ticket-outline'} size={16} color={colors.gold} />
            <Text style={styles.prizeLabel} numberOfLines={1}>
              {PRIZE_LABELS[i] ?? 'Participation'}
            </Text>
          </View>
          <Text style={styles.prizeText}>{pr.coins} coins</Text>
          {pr.medals ? <Text style={styles.prizeText}>{pr.medals} medals</Text> : null}
          {pr.skin ? <Text style={[styles.prizeText, { color: colors.purple }]}>Skin!</Text> : null}
        </View>
      ))}
    </View>
  );

  const rules = (
    <P dim>
      Knockout tournament: 8 players, half zombies and half survivors. You advance only if the team you started on wins, all the way to a 2-player final. In tournaments survivors are faster and zombies are slower.
      You get your prize as soon as your run ends. Every match also earns leaderboard points (win 100, task 10, infection 15, champion +{CHAMPION_POINTS}).
    </P>
  );

  const listRow = (t: Tournament) => {
    const entry = profile.tournaments[t.id];
    return (
      <Pressable onPress={() => open(t)} style={[styles.row, tournamentStatus(t, now) === 'live' && styles.rowLive]}>
        <Glyph emoji={t.icon} size={28} color={colors.gold} />
        <View style={styles.rowText}>
          <View style={styles.nameRow}>
            <Text style={styles.rowName} numberOfLines={1}>
              {t.name}
            </Text>
            {entry ? <Icon name="check-circle" size={14} color={colors.toxic} /> : null}
          </View>
          <Text style={styles.clockText}>
            {clock(t.startsAt)} – {clock(t.endsAt)}
          </Text>
        </View>
        {statusPill(t, now)}
      </Pressable>
    );
  };

  const deskCard = (t: Tournament) => {
    const entry = profile.tournaments[t.id];
    return (
      <Card highlight={tournamentStatus(t, now) === 'live' ? colors.blood : undefined} style={styles.deskCard}>
        <View style={styles.head}>
          <Glyph emoji={t.icon} size={36} color={colors.gold} />
          <View style={styles.headText}>
            <H size={17}>{t.name}</H>
            <P dim style={styles.small}>
              {clock(t.startsAt)} – {clock(t.endsAt)}
            </P>
          </View>
          {statusPill(t, now)}
        </View>
        <Text style={styles.desc} numberOfLines={2}>
          {t.description}
        </Text>
        {prizes(t)}
        {entry ? <Text style={styles.registered}>Registered · {entry.points} points</Text> : null}
        <View style={{ flex: 1 }} />
        <View style={styles.actions}>
          {action(t, true)}
          <Button small title="Leaderboard" lead={<Icon name="podium" size={16} color={colors.text} />} variant="dark" onPress={() => open(t)} style={styles.grow} />
        </View>
      </Card>
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'live', label: `Live (${groups.live.length})` },
    { id: 'upcoming', label: `Upcoming (${groups.upcoming.length})` },
    { id: 'ended', label: `Ended (${groups.ended.length})` },
    ...(isDesktop ? [] : [{ id: 'rules' as Tab, label: 'Rules' }]),
  ];

  const grid = (
    <Grid items={shown} minWidth={isDesktop ? 340 : 300} minHeight={isDesktop ? 280 : 60} gap={isDesktop ? 14 : 8} paged renderItem={isDesktop ? deskCard : listRow} />
  );

  if (picked && !isDesktop) {
    const entry = profile.tournaments[picked.id];
    return (
      <Screen>
        <ScreenHeader title={picked.name} onBack={() => setOpenId(null)} />
        <View style={styles.phoneDetail}>
          <View style={styles.summary}>
            <Glyph emoji={picked.icon} size={36} color={colors.gold} />
            <P dim style={styles.small}>
              {clock(picked.startsAt)} – {clock(picked.endsAt)}
            </P>
            {statusPill(picked, now)}
            {entry ? <Text style={styles.registered}>Registered · {entry.points} points</Text> : null}
            <Text style={[styles.desc, styles.small]} numberOfLines={3}>
              {picked.description}
            </Text>
            <View style={{ flex: 1 }} />
            {action(picked)}
          </View>
          <View style={styles.main}>
            <Tabs<Detail>
              tabs={[
                { id: 'prizes', label: 'Prizes' },
                { id: 'board', label: 'Leaderboard' },
              ]}
              value={detail}
              onChange={setDetail}
            />
            <View style={styles.listing}>{detail === 'prizes' ? prizes(picked) : standings(picked)}</View>
          </View>
        </View>
      </Screen>
    );
  }

  const side = (
    <View style={styles.side}>
      <Card style={{ gap: 6 }}>
        <H size={17}>Rules</H>
        {rules}
      </Card>
      {focus ? (
        <Card style={styles.board}>
          <H size={17}>Leaderboard</H>
          <P dim style={styles.small}>
            {focus.name}
          </P>
          <View style={styles.listing}>{standings(focus)}</View>
        </Card>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Tournaments" />
      <View style={[styles.split, isDesktop && styles.splitDesk]}>
        {isDesktop ? side : null}
        <View style={styles.main}>
          <Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} />
          <View style={styles.listing}>{tab === 'rules' ? <Card>{rules}</Card> : shown.length ? grid : <P dim>{EMPTY[tab]}</P>}</View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row', gap: 14 },
  splitDesk: { gap: 28 },
  side: { width: 360, gap: 14 },
  main: { flex: 1, gap: 10 },
  board: { flex: 1, gap: 6 },
  listing: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: 12, lineHeight: 16 },
  desc: { color: colors.textDim, fontSize: 13, lineHeight: 18, textAlign: 'left' },
  registered: { color: colors.toxic, fontWeight: '800', fontSize: 12, textAlign: 'left' },
  grow: { flex: 1 },
  // Phone list
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, backgroundColor: colors.panel, borderRadius: radius.sm, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  rowLive: { borderColor: colors.blood },
  rowText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { flexShrink: 1, color: colors.text, fontWeight: '900', fontSize: 14, textAlign: 'left' },
  clockText: { color: colors.textDim, fontSize: 11, textAlign: 'left' },
  // Phone detail
  phoneDetail: { flex: 1, flexDirection: 'row', gap: 12 },
  summary: { width: 230, gap: 6 },
  // Desktop card
  deskCard: { flex: 1, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headText: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  prizes: { flexDirection: 'row', gap: 6 },
  prize: { flex: 1, gap: 2, padding: 6, backgroundColor: colors.bgAlt, borderRadius: 10 },
  prizeHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prizeLabel: { flexShrink: 1, color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  prizeText: { color: colors.coin, fontWeight: '800', fontSize: 12 },
  // Leaderboard
  standing: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.bgAlt },
  ownRow: { backgroundColor: 'rgba(124,255,79,0.14)' },
  ownText: { color: colors.toxic },
  rank: { width: 26, color: colors.textDim, fontWeight: '900', textAlign: 'center' },
  standingName: { flex: 1, color: colors.text, fontWeight: '700', textAlign: 'left' },
  points: { color: colors.gold, fontWeight: '900', textAlign: 'right' },
});
