// End-of-match screen: winner, rewards, level-ups, achievements and the scoreboard.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { ScreenProps } from '../navigation/types';
import { Screen, Card, H, P } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { ACHIEVEMENTS, formatSeconds, medalName, obstacleMedal } from '../logic/progression';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';
import { playSfx } from '../services/sound';

export function ResultsScreen({ navigation, route }: ScreenProps<'Results'>) {
  const { result, rewards, levelBefore, levelAfter, achievementIds, tournamentPoints, flow, map, roomCode, players } = route.params;
  const pop = useRef(new Animated.Value(0)).current;
  const lines = useRef(rewards.lines.map(() => new Animated.Value(0))).current;

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
      ? 'הגעת לסיום!'
      : 'הזמן נגמר'
    : result.winner === 'survivor'
      ? 'השורדים ניצחו!'
      : result.winner === 'zombie'
        ? 'הזומבים השתלטו!'
        : 'המשחק הסתיים';
  const tint = obstacle ? colors.gold : result.winner === 'zombie' ? colors.zombie : colors.survivor;
  const achievements = ACHIEVEMENTS.filter((a) => achievementIds.includes(a.id));
  const sorted = [...players].sort((a, b) => b.infections * 15 + b.tasks * 10 - (a.infections * 15 + a.tasks * 10));

  return (
    <Screen scroll>
      <Animated.View style={[styles.banner, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
        <Text style={styles.big}>{obstacle ? (medal ? { gold: '🥇', silver: '🥈', bronze: '🥉' }[medal] : result.won ? '🏁' : '⌛') : result.won ? '🏆' : '💀'}</Text>
        <Text style={[styles.title, { color: tint }]}>{title}</Text>
        <Text style={[styles.outcome, { color: result.won ? colors.toxic : colors.blood }]}>{result.won ? 'ניצחון' : 'הפסד'}</Text>
        {obstacle && result.obstacleTimeMs !== undefined ? (
          <P style={{ textAlign: 'center', marginTop: 4 }}>
            זמן: {(result.obstacleTimeMs / 1000).toFixed(2)} שנ׳ {medal ? `· מדליית ${medalName(medal)}` : ''}
          </P>
        ) : (
          <P dim style={{ textAlign: 'center', marginTop: 4 }}>
            {result.startRole === 'zombie' ? 'התחלת כזומבי' : result.finalRole === 'zombie' ? 'נדבקת במהלך המשחק' : 'שרדת עד הסוף'} · {formatSeconds(result.durationSec)}
          </P>
        )}
      </Animated.View>

      {levelAfter > levelBefore ? (
        <Card highlight={colors.gold} style={styles.levelUp}>
          <Text style={styles.levelUpText}>⭐ עלית לרמה {levelAfter}! ⭐</Text>
          <P dim style={{ textAlign: 'center' }}>פריטים חדשים אולי נפתחו בחנות</P>
        </Card>
      ) : null}

      <Card style={{ marginTop: 12 }}>
        <H size={16}>פרסים</H>
        {rewards.lines.map((l, i) => (
          <Animated.View key={i} style={[styles.line, { opacity: lines[i], transform: [{ translateX: lines[i].interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}>
            <Text style={styles.lineValues}>
              {l.xp ? `+${l.xp} XP ` : ''}
              {l.coins ? `+${l.coins} 🪙 ` : ''}
              {l.medals ? `+${l.medals} 🏅` : ''}
            </Text>
            <Text style={styles.lineLabel}>{l.label}</Text>
          </Animated.View>
        ))}
        <View style={styles.total}>
          <Text style={styles.totalText}>
            +{rewards.xp} XP · +{rewards.coins} 🪙{rewards.medals ? ` · +${rewards.medals} 🏅` : ''}
          </Text>
          <Text style={styles.lineLabel}>סה״כ</Text>
        </View>
        {tournamentPoints > 0 ? <Text style={styles.tournament}>🏆 +{tournamentPoints} נקודות טורניר</Text> : null}
      </Card>

      {achievements.length ? (
        <Card style={{ marginTop: 12 }} highlight={colors.purple}>
          <H size={16}>הישגים חדשים!</H>
          {achievements.map((a) => (
            <View key={a.id} style={styles.line}>
              <Text style={styles.lineValues}>
                {a.coins ? `+${a.coins} 🪙 ` : ''}
                {a.medals ? `+${a.medals} 🏅` : ''}
              </Text>
              <Text style={styles.lineLabel}>
                {a.badge} {a.title}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {!obstacle ? (
        <Card style={{ marginTop: 12 }}>
          <H size={16}>טבלת שחקנים</H>
          <View style={[styles.row, { borderBottomWidth: 1 }]}>
            <Text style={styles.colHead}>🧟</Text>
            <Text style={styles.colHead}>🔧</Text>
            <Text style={[styles.colHead, { flex: 1, textAlign: 'right' }]}>שחקן</Text>
          </View>
          {sorted.map((p, i) => (
            <View key={i} style={[styles.row, p.isLocal && { backgroundColor: 'rgba(124,255,79,0.08)' }]}>
              <Text style={styles.col}>{p.infections}</Text>
              <Text style={styles.col}>{p.tasks}</Text>
              <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <Character skin={p.skin} size={28} role={p.role} />
                <Text style={[styles.pName, p.isLocal && { color: colors.toxic }]} numberOfLines={1}>
                  {p.name}
                  {p.isBot ? ' 🤖' : ''}
                </Text>
                <Text style={{ color: p.role === 'zombie' ? colors.zombie : colors.survivor, fontSize: 11 }}>{p.role === 'zombie' ? 'זומבי' : 'שורד'}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 18 }}>
        <Button title="שחק שוב" icon="🔁" style={{ flex: 1 }} onPress={() => navigation.replace('Lobby', { flow, map, roomCode })} />
        <Button title="לתפריט" icon="🏠" variant="dark" style={{ flex: 1 }} onPress={() => navigation.popToTop()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', marginTop: 16, marginBottom: 6 },
  big: { fontSize: 76 },
  title: { fontSize: 34, fontWeight: '900', textAlign: 'center', textShadowColor: '#000', textShadowRadius: 10 },
  outcome: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  levelUp: { marginTop: 12, alignItems: 'center' },
  levelUpText: { color: colors.gold, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  lineLabel: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  lineValues: { color: colors.coin, fontWeight: '800' },
  total: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  totalText: { color: colors.toxic, fontWeight: '900', fontSize: 16 },
  tournament: { color: colors.gold, fontWeight: '900', textAlign: 'right', marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: 4 },
  colHead: { width: 36, color: colors.textDim, fontWeight: '800', textAlign: 'center' },
  col: { width: 36, color: colors.text, fontWeight: '800', textAlign: 'center' },
  pName: { color: colors.text, fontWeight: '800', flexShrink: 1 },
});
