// End-of-match screen: winner, rewards, level-ups, achievements and the scoreboard. The phone keeps the result on the left and switches between the panels on the right; the desktop shows every panel at once.
import { useDevice } from '../utils/device';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import { Card, Coin, Grid, H, P, Pill, Screen, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { Glyph, Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { ACHIEVEMENTS, formatSeconds, medalName, obstacleMedal } from '../logic/progression';
import { knockoutOutcome, roundName } from '../logic/tournaments';
import { nextKnockoutSetup } from '../utils/matchSetup';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';
import { playSfx } from '../services/sound';

type Panel = 'rewards' | 'achievements' | 'scoreboard';

export function ResultsScreen({ navigation, route }: ScreenProps<'Results'>) {
  const { isDesktop } = useDevice();
  const { result, rewards, levelBefore, levelAfter, achievementIds, tournamentPoints, flow, map, roomCode, players, setup } = route.params;
  const ko = knockoutOutcome(result);
  const pop = useRef(new Animated.Value(0)).current;
  const lines = useRef(rewards.lines.map(() => new Animated.Value(0))).current;
  const [panel, setPanel] = useState<Panel>('rewards');

  useEffect(() => {
    haptic(result.won ? 'success' : 'error');
    playSfx(result.won ? 'win' : 'lose');
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.stagger(
        140,
        lines.map((v) => Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true })),
      ),
    ]).start();
  }, [pop, lines, result.won]);

  const obstacle = result.mode === 'obstacle';
  const medal = obstacle && result.obstacleTimeMs !== undefined ? obstacleMedal(result.mapId, result.obstacleTimeMs, map.medalTimes) : null;
  const title = obstacle
    ? result.won
      ? 'You finished!'
      : 'Time is up'
    : result.winner === 'survivor'
      ? 'Survivors win!'
      : result.winner === 'zombie'
        ? 'Zombies took over!'
        : 'Match over';
  const tint = obstacle ? colors.gold : result.winner === 'zombie' ? colors.zombie : colors.survivor;
  const bigIcon: IconName = obstacle ? (medal ? 'medal' : result.won ? 'flag-checkered' : 'timer-sand') : result.won ? 'trophy' : 'skull';
  const achievements = ACHIEVEMENTS.filter((a) => achievementIds.includes(a.id));
  const sorted = [...players].sort((a, b) => b.infections * 15 + b.tasks * 10 - (a.infections * 15 + a.tasks * 10));
  const leveledUp = levelAfter > levelBefore;
  const popStyle = { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] };
  const outcomeLabel = result.won ? 'Victory' : 'Defeat';
  const outcomeColor = result.won ? colors.toxic : colors.blood;

  const knockout = ko ? (
    <Text style={[styles.knockout, { fontSize: isDesktop ? 18 : 14, textAlign: isDesktop ? 'center' : 'left', color: ko.kind === 'out' ? colors.blood : colors.gold }]}>
      {ko.kind === 'champion'
        ? 'Tournament champion!'
        : ko.kind === 'advance'
          ? `Advanced to the ${roundName(ko.nextSize)}!`
          : ko.place === 2
            ? 'Second place in the tournament'
            : ko.place === 3
              ? 'Knocked out in the semi-final'
              : 'Knocked out of the tournament'}
    </Text>
  ) : null;

  const detail = (
    <Text style={[styles.detail, { fontSize: isDesktop ? 15 : 12, textAlign: isDesktop ? 'center' : 'left' }]}>
      {obstacle && result.obstacleTimeMs !== undefined
        ? `Time: ${(result.obstacleTimeMs / 1000).toFixed(2)}s${medal ? ` · ${medalName(medal)} medal` : ''}`
        : `${result.startRole === 'zombie' ? 'Started as a zombie' : result.finalRole === 'zombie' ? 'Infected during the match' : 'Survived to the end'} · ${formatSeconds(result.durationSec)}`}
    </Text>
  );

  const bannerPhone = (
    <Animated.View style={[styles.bannerPhone, popStyle]}>
      <View style={styles.headRow}>
        <View style={[styles.badgePhone, { backgroundColor: tint }]}>
          <Icon name={bigIcon} size={24} color={colors.ink} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.titlePhone, { color: tint }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.outcome, { fontSize: 13, color: outcomeColor }]}>{outcomeLabel}</Text>
        </View>
      </View>
      {knockout}
      {detail}
    </Animated.View>
  );

  const bannerDesk = (
    <Animated.View style={[styles.bannerDesk, popStyle]}>
      <View style={[styles.badgeDesk, { backgroundColor: tint }]}>
        <Icon name={bigIcon} size={64} color={colors.ink} />
      </View>
      <Text style={[styles.titleDesk, { color: tint }]}>{title}</Text>
      <Text style={[styles.outcome, { fontSize: 18, color: outcomeColor }]}>{outcomeLabel}</Text>
      {knockout}
      {detail}
    </Animated.View>
  );

  const levelUpText = `Level up! You are now level ${levelAfter}!`;
  // Desktop: a gold card with the shop note. Phone: one pill, so the left column stays short.
  const levelUp = leveledUp ? (
    isDesktop ? (
      <Card highlight={colors.gold} style={styles.levelUp}>
        <Text style={styles.levelUpText}>{levelUpText}</Text>
        <P dim style={styles.center}>
          New items may have unlocked in the shop
        </P>
      </Card>
    ) : (
      <Pill text={levelUpText} color={colors.gold} lead={<Icon name="star" size={14} color={colors.gold} />} style={styles.pill} />
    )
  ) : null;

  const tournamentLine = tournamentPoints > 0 ? <Text style={[styles.tournament, !isDesktop && styles.tournamentPhone]}>+{tournamentPoints} tournament points</Text> : null;

  // The phone rows are tighter so the whole list fits the panel without scrolling.
  const rewardsBody = (
    <View style={[styles.body, !isDesktop && styles.bodyPhone]}>
      {rewards.lines.map((l, i) => (
        <Animated.View
          key={i}
          style={[styles.line, !isDesktop && styles.linePhone, { opacity: lines[i], transform: [{ translateX: lines[i].interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}
        >
          <Text style={[styles.lineValues, !isDesktop && styles.textPhone]}>
            {l.xp ? `+${l.xp} XP ` : ''}
            {l.coins ? `+${l.coins} coins ` : ''}
            {l.medals ? `+${l.medals} medals` : ''}
          </Text>
          <View style={styles.lineTitle}>
            {l.icons?.map((e) => <Glyph key={e} emoji={e} size={16} color={colors.gold} />)}
            <Text style={[styles.lineLabel, !isDesktop && styles.textPhone]}>{l.label}</Text>
          </View>
        </Animated.View>
      ))}
      <View style={[styles.total, !isDesktop && styles.totalPhone]}>
        <View style={styles.totalValues}>
          <Text style={styles.totalText}>
            +{rewards.xp} XP · +{rewards.coins}
          </Text>
          <Coin size={14} />
          {rewards.medals ? <Text style={styles.totalText}>· +{rewards.medals} medals</Text> : null}
        </View>
        <Text style={[styles.lineLabel, !isDesktop && styles.textPhone]}>Total</Text>
      </View>
    </View>
  );

  const achievementsBody = (
    <View style={[styles.body, !isDesktop && styles.bodyPhone]}>
      {achievements.map((a) => (
        <View key={a.id} style={[styles.line, !isDesktop && styles.linePhone]}>
          <Text style={[styles.lineValues, !isDesktop && styles.textPhone]}>
            {a.coins ? `+${a.coins} coins ` : ''}
            {a.medals ? `+${a.medals} medals` : ''}
          </Text>
          <View style={styles.badgeRow}>
            <Glyph emoji={a.badge} size={16} color={colors.gold} fallbackStyle={styles.lineLabel} />
            <Text style={[styles.lineLabel, !isDesktop && styles.textPhone]}>{a.title}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const scoreboard = (
    <Grid
      items={sorted}
      minWidth={isDesktop ? 240 : 190}
      minHeight={isDesktop ? 56 : 40}
      gap={isDesktop ? 10 : 6}
      paged
      renderItem={(p) => (
        <View style={[styles.player, p.isLocal && styles.playerMe]}>
          <Character skin={p.skin} size={isDesktop ? 34 : 26} role={p.role} />
          <View style={styles.playerText}>
            <Text style={[styles.pName, p.isLocal && { color: colors.toxic }]} numberOfLines={1}>
              {p.name}
              {p.isBot ? ' (bot)' : ''}
            </Text>
            <Text style={[styles.pRole, { color: p.role === 'zombie' ? colors.zombie : colors.survivor }]}>{p.role === 'zombie' ? 'Zombie' : 'Survivor'}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="virus" size={14} color={colors.textDim} />
            <Text style={styles.statText}>{p.infections}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="wrench" size={14} color={colors.textDim} />
            <Text style={styles.statText}>{p.tasks}</Text>
          </View>
        </View>
      )}
    />
  );

  const primary = (small: boolean) =>
    ko?.kind === 'advance' && !roomCode && setup ? (
      <Button
        title={`To the ${roundName(ko.nextSize)}`}
        icon="⏭️"
        variant="gold"
        small={small}
        onPress={() => {
          const next = nextKnockoutSetup(setup, result.startRole);
          if (next) navigation.replace('Game', { setup: next });
          else navigation.replace('Lobby', { flow, map });
        }}
      />
    ) : (
      <Button
        title={ko?.kind === 'advance' ? `To the ${roundName(ko.nextSize)}` : ko ? 'New tournament' : 'Play again'}
        icon={ko?.kind === 'advance' ? '⏭️' : '🔁'}
        small={small}
        onPress={() => navigation.replace('Lobby', { flow, map, roomCode })}
      />
    );

  const panels: { id: Panel; label: string }[] = [
    { id: 'rewards', label: 'Rewards' },
    ...(achievements.length ? [{ id: 'achievements' as const, label: 'Achievements' }] : []),
    ...(obstacle ? [] : [{ id: 'scoreboard' as const, label: 'Scoreboard' }]),
  ];
  const panelBody = panel === 'achievements' ? achievementsBody : panel === 'scoreboard' ? scoreboard : rewardsBody;

  const left = isDesktop ? (
    <View style={styles.leftDesk}>
      {bannerDesk}
      {levelUp}
      {tournamentLine}
      <View style={styles.grow} />
      {primary(false)}
      <Button title="Menu" icon="🏠" variant="dark" onPress={() => navigation.popToTop()} />
    </View>
  ) : (
    <View style={styles.leftPhone}>
      {bannerPhone}
      {levelUp}
      {tournamentLine}
      <View style={styles.grow} />
      {primary(true)}
      <Button title="Menu" icon="🏠" variant="dark" small onPress={() => navigation.popToTop()} />
    </View>
  );

  const right = isDesktop ? (
    <View style={styles.deskRight}>
      <View style={styles.deskTop}>
        <Card style={styles.deskCard}>
          <H size={16}>Rewards</H>
          {rewardsBody}
        </Card>
        {achievements.length ? (
          <Card style={styles.deskCard} highlight={colors.purple}>
            <H size={16}>New achievements!</H>
            {achievementsBody}
          </Card>
        ) : null}
      </View>
      {obstacle ? null : (
        <Card style={styles.deskScore}>
          <H size={16}>Scoreboard</H>
          {scoreboard}
        </Card>
      )}
    </View>
  ) : (
    <View style={styles.right}>
      {panels.length > 1 ? <Tabs<Panel> tabs={panels} value={panel} onChange={setPanel} /> : null}
      <Card style={styles.panel}>{panelBody}</Card>
    </View>
  );

  return (
    <Screen>
      <View style={[styles.row, isDesktop && styles.rowDesk]}>
        {left}
        {right}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 12 },
  rowDesk: { gap: 28 },
  grow: { flex: 1 },
  center: { textAlign: 'center' },
  // Phone: the result on the left (about 240px), one panel at a time on the right.
  leftPhone: { width: 240, gap: 8 },
  bannerPhone: { gap: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgePhone: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.35)' },
  headText: { flex: 1 },
  titlePhone: { fontSize: 18, fontWeight: '900', textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  right: { flex: 1, gap: 6 },
  panel: { flex: 1, padding: 10 },
  // Desktop: the banner and actions on the left, every panel on the right.
  leftDesk: { width: 360, gap: 14 },
  bannerDesk: { alignItems: 'center', gap: 6 },
  badgeDesk: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6, borderBottomColor: 'rgba(0,0,0,0.35)', marginBottom: 6 },
  titleDesk: { fontSize: 34, fontWeight: '900', textAlign: 'center', textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 },
  levelUp: { alignItems: 'center', gap: 4, padding: 14 },
  levelUpText: { color: colors.gold, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  deskRight: { flex: 1, gap: 14 },
  deskTop: { flex: 3, flexDirection: 'row', gap: 14 },
  deskCard: { flex: 1, padding: 16, gap: 8 },
  deskScore: { flex: 2, padding: 16, gap: 8 },
  // Shared
  outcome: { fontWeight: '900' },
  knockout: { fontWeight: '900' },
  detail: { color: colors.textDim },
  pill: { alignSelf: 'flex-start' },
  body: { gap: 2 },
  bodyPhone: { gap: 0 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  linePhone: { paddingVertical: 2 },
  textPhone: { fontSize: 13 },
  lineLabel: { color: colors.text, fontWeight: '700', textAlign: 'left', flexShrink: 1 },
  lineTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  lineValues: { color: colors.coin, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  totalPhone: { paddingTop: 4 },
  totalValues: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  totalText: { color: colors.toxic, fontWeight: '900', fontSize: 15 },
  tournament: { color: colors.gold, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  tournamentPhone: { textAlign: 'left', fontSize: 13, marginTop: 2 },
  player: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, borderRadius: radius.sm, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  playerMe: { borderColor: colors.toxic, backgroundColor: 'rgba(124,255,79,0.08)' },
  playerText: { flex: 1 },
  pName: { color: colors.text, fontWeight: '800', fontSize: 13 },
  pRole: { fontSize: 11, fontWeight: '700' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statText: { color: colors.text, fontWeight: '800', fontSize: 12 },
});
