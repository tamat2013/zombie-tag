// Pick a map for the match: built-in, your own, community maps, or import one by share code.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
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
      if (!m) toast('לא נמצאה מפה עם הקוד הזה', { tone: 'bad' });
      else if (m.kind !== kind) toast(kind === 'obstacle' ? 'זו מפת זירה, לא מסלול מכשולים' : 'זו מפת מסלול מכשולים', { tone: 'bad' });
      else {
        setSelected(m);
        toast(`המפה "${m.name}" נטענה`, { icon: '🗺️', tone: 'good' });
      }
    } catch {
      toast('הטעינה נכשלה', { tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title={kind === 'obstacle' ? 'בחר מסלול' : 'בחר מפה'} />

      <View style={styles.selected}>
        <MapPreview map={selected} width={Math.min(width - 32, 520)} />
        <View style={{ marginTop: 8 }}>
          <H size={18}>{selected.name}</H>
          <P dim>
            {selected.width}×{selected.height} · יוצר: {selected.author}
            {selected.medalTimes ? ` · 🥇 ${formatSeconds(selected.medalTimes[0])}` : ''}
            {profile.bestObstacleTimes[selected.id] ? ` · השיא שלך ${formatSeconds(profile.bestObstacleTimes[selected.id] / 1000)}` : ''}
          </P>
        </View>
      </View>

      {!officialOnly ? (
        <Tabs<Source>
          tabs={[
            { id: 'builtin', label: 'רשמיות' },
            { id: 'mine', label: `שלי (${mine.filter((m) => m.kind === kind).length})` },
            ...(authService.isOnline ? [{ id: 'community' as Source, label: 'קהילה' }] : []),
          ]}
          value={source}
          onChange={setSource}
        />
      ) : (
        <P dim style={{ marginBottom: 6 }}>
          בטורניר משחקים רק במפות רשמיות.
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
              {m.builtIn ? 'רשמית' : m.author}
              {m.shareCode && !m.builtIn ? ` · ${m.shareCode}` : ''}
              {profile.obstacleMedals[m.id] ? ` · ${{ gold: '🥇', silver: '🥈', bronze: '🥉' }[profile.obstacleMedals[m.id]]}` : ''}
            </Text>
          </Pressable>
        ))}
        {!loading && list.length === 0 ? <P dim>{source === 'mine' ? 'עוד לא יצרת מפות מהסוג הזה.' : 'אין מפות להצגה.'}</P> : null}
      </View>

      {!officialOnly ? (
        <View style={styles.importRow}>
          <Button title="טען" small variant="blue" onPress={importCode} />
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="קוד שיתוף של מפה"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            maxLength={6}
            style={styles.input}
          />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 18 }}>
        <Button title="המשך ללובי" icon="▶️" style={{ flex: 2 }} onPress={() => navigation.navigate('Lobby', { flow, map: selected })} />
        {!officialOnly ? <Button title="צור מפה" icon="✏️" variant="dark" style={{ flex: 1 }} onPress={() => navigation.navigate('MapCreator')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  selected: { alignItems: 'center', marginBottom: 12 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  card: { backgroundColor: colors.panel, borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontWeight: '800', marginTop: 6, textAlign: 'right' },
  cardSub: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  importRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#0a0f09', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, textAlign: 'right', letterSpacing: 2 },
});
