// Pick a map for the match: built-in, your own, community maps, or import one by share code.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { tr } from '../i18n/language';
import { Text } from '../i18n/Text';
import { useFocusEffect } from '@react-navigation/native';
import type { ScreenProps } from '../navigation/types';
import type { GameMap } from '../types';
import { Screen, ScreenHeader, H, P, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { MapPreview } from '../components/MapPreview';
import { useGame, useProfile } from '../state/GameContext';
import { BUILT_IN_MAPS } from '../data/maps';
import { mapService } from '../services/mapService';
import { authService } from '../services/authService';
import { formatSeconds } from '../logic/progression';
import { colors, radius } from '../theme';

type Source = 'builtin' | 'mine' | 'community';

export function MapSelectScreen({ navigation, route }: ScreenProps<'MapSelect'>) {
  const { flow } = route.params;
  const profile = useProfile();
  const { toast } = useGame();
  const { width } = useWindowDimensions();
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
  const cardW = Math.min(220, (Math.min(width, 900) - 32 - 12) / 2);

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

  return (
    <Screen scroll>
      <ScreenHeader title={kind === 'obstacle' ? 'Choose a course' : 'Choose a map'} />

      <View style={styles.selected}>
        <MapPreview map={selected} width={Math.min(width - 32, 520)} />
        <View style={{ marginTop: 8 }}>
          <H size={18}>{selected.name}</H>
          <P dim>
            {selected.width}×{selected.height} · by {selected.author}
            {selected.medalTimes ? ` · 🥇 ${formatSeconds(selected.medalTimes[0])}` : ''}
            {profile.bestObstacleTimes[selected.id] ? ` · your best ${formatSeconds(profile.bestObstacleTimes[selected.id] / 1000)}` : ''}
          </P>
        </View>
      </View>

      {!officialOnly ? (
        <Tabs<Source>
          tabs={[
            { id: 'builtin', label: 'Official' },
            { id: 'mine', label: `Mine (${mine.filter((m) => m.kind === kind).length})` },
            ...(authService.isOnline ? [{ id: 'community' as Source, label: 'Community' }] : []),
          ]}
          value={source}
          onChange={setSource}
        />
      ) : (
        <P dim style={{ marginBottom: 6 }}>
          Tournaments use official maps only.
        </P>
      )}

      {loading ? <ActivityIndicator color={colors.toxic} style={{ marginTop: 16 }} /> : null}
      <View style={styles.grid}>
        {list.map((m) => (
          <Pressable key={m.id} onPress={() => setSelected(m)} style={[styles.card, { width: cardW }, selected.id === m.id && { borderColor: colors.toxic, borderWidth: 2 }]}>
            <MapPreview map={m} width={cardW - 16} />
            <Text style={styles.cardTitle} numberOfLines={1}>
              {m.name}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {m.builtIn ? 'Official' : m.author}
              {m.shareCode && !m.builtIn ? ` · ${m.shareCode}` : ''}
              {profile.obstacleMedals[m.id] ? ` · ${{ gold: '🥇', silver: '🥈', bronze: '🥉' }[profile.obstacleMedals[m.id]]}` : ''}
            </Text>
          </Pressable>
        ))}
        {!loading && list.length === 0 ? <P dim>{source === 'mine' ? 'You have not made any maps of this kind yet.' : 'No maps to show.'}</P> : null}
      </View>

      {!officialOnly ? (
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
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Button title="Continue to lobby" icon="▶️" style={{ flex: 2 }} onPress={() => navigation.navigate('Lobby', { flow, map: selected })} />
        {!officialOnly ? <Button title="Create map" icon="✏️" variant="dark" style={{ flex: 1 }} onPress={() => navigation.navigate('MapCreator')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  selected: { alignItems: 'center', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  card: { backgroundColor: colors.panel, borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontWeight: '800', marginTop: 6, textAlign: 'left' },
  cardSub: { color: colors.textDim, fontSize: 11, textAlign: 'left' },
  importRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#0a0f09', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, textAlign: 'left', letterSpacing: 2 },
});
