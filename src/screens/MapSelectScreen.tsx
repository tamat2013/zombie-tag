// Pick a map for the match: built-in, your own, community maps, or import one by share code. The phone shows the chosen map on the left and pages through the maps on the right.
import { useDevice } from '../utils/device';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Pressable, TextInput, View } from '../i18n/Layout';
import { tr } from '../i18n/language';
import { Text } from '../i18n/Text';
import { useFocusEffect } from '@react-navigation/native';
import type { ScreenProps } from '../navigation/types';
import type { GameMap } from '../types';
import { Grid, Screen, ScreenHeader, H, P, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { MapPreview } from '../components/MapPreview';
import { Icon } from '../components/Icon';
import { useGame, useProfile } from '../state/GameContext';
import { BUILT_IN_MAPS } from '../data/maps';
import { mapService } from '../services/mapService';
import { authService } from '../services/authService';
import { formatSeconds } from '../logic/progression';
import { colors, radius } from '../theme';

type Source = 'builtin' | 'mine' | 'community';

/** The widest preview of a map that still fits a box of maxWidth × maxHeight, keeping the map's shape. */
function fitWidth(map: GameMap, maxWidth: number, maxHeight: number): number {
  return Math.max(40, Math.min(maxWidth, (maxHeight * map.width) / map.height));
}

const MEDAL_COLORS = { gold: colors.gold, silver: colors.silver, bronze: colors.bronze };

export function MapSelectScreen({ navigation, route }: ScreenProps<'MapSelect'>) {
  const { flow } = route.params;
  const profile = useProfile();
  const { toast } = useGame();
  const { isDesktop } = useDevice();
  const kind: GameMap['kind'] = flow.mode === 'obstacle' ? 'obstacle' : 'arena';
  // Tournaments are played on official maps only so scores are comparable.
  const officialOnly = flow.mode === 'tournament';

  const [source, setSource] = useState<Source>('builtin');
  const [mine, setMine] = useState<GameMap[]>([]);
  const [community, setCommunity] = useState<GameMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState<GameMap>(() => BUILT_IN_MAPS.find((m) => m.kind === kind) ?? BUILT_IN_MAPS[0]);

  useFocusEffect(
    useCallback(() => {
      mapService.listMine(profile.uid).then(setMine);
    }, [profile.uid]),
  );

  useEffect(() => {
    if (source !== 'community' || community.length) return;
    setLoading(true);
    mapService
      .listCommunity()
      .then(setCommunity)
      .finally(() => setLoading(false));
  }, [source, community.length]);

  const list = (source === 'builtin' ? BUILT_IN_MAPS : source === 'mine' ? mine : community).filter((m) => m.kind === kind);

  const importCode = async () => {
    if (code.trim().length < 4) return;
    setLoading(true);
    try {
      const m = await mapService.findByCode(code);
      if (!m) toast('No map found with that code', { tone: 'bad' });
      else if (m.kind !== kind) toast(kind === 'obstacle' ? 'This is an arena map, not an obstacle course' : 'This is an obstacle course map', { tone: 'bad' });
      else {
        setSelected(m);
        toast(`Map "${m.name}" loaded`, { icon: '🗺️', tone: 'good' });
      }
    } catch {
      toast('Loading failed', { tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  const best = profile.bestObstacleTimes[selected.id];

  const left = (
    <View style={[styles.left, isDesktop ? styles.leftDesk : styles.leftPhone]}>
      <MapPreview map={selected} width={isDesktop ? 360 : fitWidth(selected, 230, 110)} />
      <View style={styles.info}>
        <H size={isDesktop ? 18 : 15}>{selected.name}</H>
        <Text style={styles.meta} numberOfLines={1}>
          {`${selected.width}×${selected.height} · by ${selected.author}`}
        </Text>
        {selected.medalTimes || best ? (
          <View style={styles.metaRow}>
            {selected.medalTimes ? (
              <View style={styles.metaItem}>
                <Icon name="medal" size={13} color={colors.gold} />
                <Text style={styles.meta}>{formatSeconds(selected.medalTimes[0])}</Text>
              </View>
            ) : null}
            {best ? (
              <View style={styles.metaItem}>
                <Icon name="timer-outline" size={13} color={colors.textDim} />
                <Text style={styles.meta}>{formatSeconds(best / 1000)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
      <Button title="Continue to lobby" icon="▶️" small={!isDesktop} onPress={() => navigation.navigate('Lobby', { flow, map: selected })} />
    </View>
  );

  const importRow = (
    <View style={styles.importRow}>
      <Button title="Load" small variant="blue" onPress={importCode} />
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder={tr('Map share code')}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        maxLength={6}
        style={styles.input}
      />
      <Button title="Create map" small variant="dark" onPress={() => navigation.navigate('MapCreator')} />
    </View>
  );

  const body = loading ? (
    <ActivityIndicator color={colors.toxic} />
  ) : list.length === 0 ? (
    <P dim>{source === 'mine' ? 'You have not made any maps of this kind yet.' : 'No maps to show.'}</P>
  ) : (
    <Grid
      items={list}
      minWidth={isDesktop ? 200 : 96}
      minHeight={isDesktop ? 190 : 90}
      gap={isDesktop ? 12 : 8}
      paged
      renderItem={(m, size) => (
        <Pressable onPress={() => setSelected(m)} style={[styles.card, selected.id === m.id && styles.cardOn]}>
          <MapPreview map={m} width={fitWidth(m, size.width - 16, size.height - (isDesktop ? 56 : 44))} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {m.name}
          </Text>
          <View style={styles.cardSubRow}>
            <Text style={styles.cardSub} numberOfLines={1}>
              {m.builtIn ? 'Official' : m.author}
              {m.shareCode && !m.builtIn ? ` · ${m.shareCode}` : ''}
            </Text>
            {profile.obstacleMedals[m.id] ? <Icon name="medal" size={12} color={MEDAL_COLORS[profile.obstacleMedals[m.id]]} /> : null}
          </View>
        </Pressable>
      )}
    />
  );

  const right = (
    <View style={styles.right}>
      {officialOnly ? (
        <P dim>Tournaments use official maps only.</P>
      ) : (
        <Tabs<Source>
          tabs={[
            { id: 'builtin', label: 'Official' },
            { id: 'mine', label: `Mine (${mine.filter((m) => m.kind === kind).length})` },
            ...(authService.isOnline ? [{ id: 'community' as Source, label: 'Community' }] : []),
          ]}
          value={source}
          onChange={setSource}
        />
      )}
      <View style={styles.gridWrap}>{body}</View>
      {officialOnly ? null : importRow}
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title={kind === 'obstacle' ? 'Choose a course' : 'Choose a map'} />
      <View style={[styles.row, isDesktop && styles.rowDesk]}>
        {left}
        {right}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 14 },
  rowDesk: { gap: 28 },
  left: { alignItems: 'center', gap: 8 },
  leftPhone: { width: 250 },
  leftDesk: { width: 400 },
  info: { alignSelf: 'stretch', gap: 2 },
  meta: { color: colors.textDim, fontSize: 13, lineHeight: 18, textAlign: 'left' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  right: { flex: 1, gap: 8 },
  gridWrap: { flex: 1 },
  importRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#0a0f09', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, textAlign: 'left', letterSpacing: 2 },
  card: { flex: 1, backgroundColor: colors.panel, borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: colors.border },
  cardOn: { borderColor: colors.toxic, borderWidth: 2 },
  cardTitle: { color: colors.text, fontWeight: '800', marginTop: 6, textAlign: 'left' },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardSub: { color: colors.textDim, fontSize: 11, textAlign: 'left', flexShrink: 1 },
});
