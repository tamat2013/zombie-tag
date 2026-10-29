// Map editor: paint tiles with a finger (or mouse), validate, save, share by code and test-play.
import React, { useMemo, useRef, useState } from 'react';
import { useDevice } from '../utils/device';
import { PanResponder, Pressable, ScrollView, Share, StyleSheet, Switch, TextInput, View, useWindowDimensions } from 'react-native';
import { tr } from '../i18n/language';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { GameMap } from '../types';
import { T } from '../types';
import { Screen, ScreenHeader, Card, Chip, H, P } from '../components/ui';
import { Glyph } from '../components/Icon';
import { Button } from '../components/Button';
import { useGame, useProfile } from '../state/GameContext';
import { createBlankMap } from '../data/maps';
import { validateMap } from '../engine/map';
import { mapService } from '../services/mapService';
import { bumpStat } from '../logic/progression';
import { colors, radius, tileColors } from '../theme';
import { haptic } from '../utils/haptics';

interface Tool {
  code: number;
  label: string;
  icon: string;
  kinds: GameMap['kind'][];
}

const TOOLS: Tool[] = [
  { code: T.FLOOR, label: 'Floor / erase', icon: '⬛', kinds: ['arena', 'obstacle'] },
  { code: T.WALL, label: 'Wall', icon: '🧱', kinds: ['arena', 'obstacle'] },
  { code: T.CRATE, label: 'Crate', icon: '📦', kinds: ['arena', 'obstacle'] },
  { code: T.TASK, label: 'Task station', icon: '🔧', kinds: ['arena'] },
  { code: T.SURVIVOR_SPAWN, label: 'Survivor spawn', icon: '🧍', kinds: ['arena', 'obstacle'] },
  { code: T.ZOMBIE_SPAWN, label: 'Zombie spawn', icon: '🧟', kinds: ['arena'] },
  { code: T.MUD, label: 'Mud (slows)', icon: '🟫', kinds: ['arena', 'obstacle'] },
  { code: T.HAZARD, label: 'Trap', icon: '☢️', kinds: ['obstacle'] },
  { code: T.SAW, label: 'Moving saw', icon: '⚙️', kinds: ['obstacle'] },
  { code: T.CHECKPOINT, label: 'Checkpoint', icon: '🚩', kinds: ['obstacle'] },
  { code: T.FINISH, label: 'Finish line', icon: '🏁', kinds: ['obstacle'] },
];

const ICON_BY_CODE: Record<number, string> = {
  [T.TASK]: '🔧',
  [T.SURVIVOR_SPAWN]: 'S',
  [T.ZOMBIE_SPAWN]: 'Z',
  [T.HAZARD]: '!',
  [T.SAW]: '⚙',
  [T.CHECKPOINT]: 'K',
  [T.FINISH]: 'F',
};

const SIZES = [
  { w: 24, h: 16, label: 'Small' },
  { w: 32, h: 20, label: 'Medium' },
  { w: 40, h: 24, label: 'Large' },
];

const Cell = React.memo(function Cell({ code, size }: { code: number; size: number }) {
  const icon = ICON_BY_CODE[code];
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: code === T.FINISH ? '#e9c46a' : tileColors[code] ?? tileColors[0],
        borderRightWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon && size >= 12 ? <Text style={{ fontSize: size * 0.55, color: '#fff', fontWeight: '900', lineHeight: size * 0.8 }}>{icon}</Text> : null}
    </View>
  );
});

const Row = React.memo(function Row({ row, size }: { row: number[]; size: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {row.map((code, i) => (
        <Cell key={i} code={code} size={size} />
      ))}
    </View>
  );
});

export function MapCreatorScreen({ navigation, route }: ScreenProps<'MapCreator'>) {
  const editing = route.params?.map && !route.params.map.builtIn ? route.params.map : undefined;
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const { width: screenW } = useWindowDimensions();
  const { isDesktop } = useDevice();

  const [dims, setDims] = useState({ w: editing?.width ?? 32, h: editing?.height ?? 20 });
  const [tiles, setTiles] = useState<number[]>(() => editing?.tiles.slice() ?? createBlankMap(32, 20));
  const [kind, setKind] = useState<GameMap['kind']>(editing?.kind ?? 'arena');
  const [name, setName] = useState(editing?.name ?? 'My map');
  const [isPublic, setIsPublic] = useState(editing?.isPublic ?? true);
  const [tool, setTool] = useState<number>(T.WALL);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<GameMap | null>(editing ?? null);
  const [saving, setSaving] = useState(false);
  const history = useRef<number[][]>([]);
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  const cell = isDesktop ? Math.max(12, Math.min(32, Math.floor((Math.min(screenW, 1600) - 248 - 64 - 400) / dims.w))) : Math.max(9, Math.min(26, Math.floor((Math.min(screenW, 1000) - 32) / dims.w)));
  const rows = useMemo(() => {
    const out: number[][] = [];
    for (let y = 0; y < dims.h; y++) out.push(tiles.slice(y * dims.w, (y + 1) * dims.w));
    return out;
  }, [tiles, dims]);

  // Painting: keep the latest values in refs so the PanResponder (created once) sees them.
  const live = useRef({ tool, cell, dims });
  live.current = { tool, cell, dims };
  const grant = useRef({ x: 0, y: 0 });
  const lastIdx = useRef(-1);

  const paintAt = (px: number, py: number) => {
    const { tool: t, cell: c, dims: d } = live.current;
    const tx = Math.floor(px / c);
    const ty = Math.floor(py / c);
    if (tx < 0 || ty < 0 || tx >= d.w || ty >= d.h) return;
    const idx = ty * d.w + tx;
    if (idx === lastIdx.current) return;
    lastIdx.current = idx;
    setTiles((cur) => {
      if (cur[idx] === t) return cur;
      const next = cur.slice();
      next[idx] = t;
      return next;
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        history.current = [...history.current.slice(-19), tilesRef.current];
        lastIdx.current = -1;
        grant.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        paintAt(grant.current.x, grant.current.y);
      },
      onPanResponderMove: (_e, g) => paintAt(grant.current.x + g.dx, grant.current.y + g.dy),
    }),
  ).current;

  const undo = () => {
    const prev = history.current.pop();
    if (prev) setTiles(prev);
  };

  const resize = (w: number, h: number) => {
    history.current = [];
    setDims({ w, h });
    setTiles(createBlankMap(w, h));
    setSaved(null);
  };

  const fill = (code: number) => {
    history.current = [...history.current.slice(-19), tiles];
    setTiles(tiles.map((c, i) => {
      const x = i % dims.w;
      const y = Math.floor(i / dims.w);
      const edge = x === 0 || y === 0 || x === dims.w - 1 || y === dims.h - 1;
      return edge ? T.WALL : code === T.FLOOR ? T.FLOOR : c;
    }));
  };

  const buildMap = (): GameMap => ({
    id: saved?.id ?? `map-${profile.uid.slice(0, 8)}-${Date.now().toString(36)}`,
    name: name.trim() || 'My map',
    author: profile.displayName,
    authorId: profile.uid,
    width: dims.w,
    height: dims.h,
    tiles,
    kind,
    isPublic,
    shareCode: saved?.shareCode,
    createdAt: saved?.createdAt,
    medalTimes: kind === 'obstacle' ? saved?.medalTimes ?? [40, 60, 90] : undefined,
  });

  const save = async (): Promise<GameMap | null> => {
    const map = buildMap();
    const v = validateMap(map);
    setErrors(v.errors);
    if (!v.ok) {
      haptic('error');
      return null;
    }
    setSaving(true);
    try {
      const isNew = !saved;
      const result = await mapService.save(JSON.parse(JSON.stringify(map)) as GameMap);
      setSaved(result);
      if (isNew) {
        const r = bumpStat(profile, 'mapsCreated');
        updateProfile(r.profile);
        r.unlocked.forEach((a) => toast(`New achievement: ${a.badge} ${a.title}`, { tone: 'good' }));
      }
      haptic('success');
      toast(`Map saved · code ${result.shareCode}`, { icon: '💾', tone: 'good' });
      return result;
    } catch (e) {
      toast('Save failed', { tone: 'bad' });
      console.warn(e);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    const m = saved ?? (await save());
    if (!m) return;
    try {
      await Share.share({ message: tr(`Play my map "${m.name}" in Zombie Outbreak! Map code: ${m.shareCode}`) });
    } catch {
      toast(`Map code: ${m.shareCode}`);
    }
  };

  const testPlay = async () => {
    const m = await save();
    if (!m) return;
    navigation.navigate('Lobby', { flow: { mode: m.kind === 'obstacle' ? 'obstacle' : 'training' }, map: m });
  };

  const tools = TOOLS.filter((t) => t.kinds.includes(kind));

  const canvas = (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <View {...pan.panHandlers} style={{ width: cell * dims.w, height: cell * dims.h, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        <View pointerEvents="none">
          {rows.map((r, y) => (
            <Row key={y} row={r} size={cell} />
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <Screen scroll>
      <ScreenHeader title={editing ? 'Edit map' : 'Map creator'} />

      <View style={isDesktop ? { flexDirection: 'row', gap: 24, alignItems: 'flex-start' } : undefined}>
      <View style={isDesktop ? { width: 360 } : undefined}>
      <Card>
        <View style={styles.row}>
          <TextInput value={name} onChangeText={setName} maxLength={22} style={styles.input} placeholder={tr('Map name')} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={[styles.row, { marginTop: 10, flexWrap: 'wrap' }]}>
          <Chip label="Arena" active={kind === 'arena'} onPress={() => setKind('arena')} />
          <Chip label="Obstacle course" active={kind === 'obstacle'} onPress={() => setKind('obstacle')} color={colors.blue} />
          <View style={{ width: 12 }} />
          {!editing
            ? SIZES.map((s) => <Chip key={s.label} label={`${s.label} ${s.w}×${s.h}`} active={dims.w === s.w} onPress={() => resize(s.w, s.h)} color={colors.gold} />)
            : null}
        </View>
        <View style={[styles.row, { marginTop: 10, justifyContent: 'space-between' }]}>
          <Text style={styles.label}>Public (shown in Community)</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.toxicDark, false: '#333' }} thumbColor={isPublic ? colors.toxic : '#999'} />
        </View>
      </Card>

      <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tools, isDesktop && { flexWrap: 'wrap' }]} style={isDesktop ? { flexGrow: 0 } : undefined}>
        {tools.map((t) => (
          <Pressable key={t.code} onPress={() => setTool(t.code)} style={[styles.tool, tool === t.code && { borderColor: colors.toxic, backgroundColor: 'rgba(198,255,61,0.16)' }]}>
            <View style={[styles.toolSwatch, { backgroundColor: t.code === T.FINISH ? '#e9c46a' : tileColors[t.code] }]}>
              <Glyph emoji={t.icon} size={18} color="#0d0a1f" />
            </View>
            <Text style={styles.toolLabel}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!isDesktop ? canvas : null}

      <View style={[styles.row, { marginTop: 10, gap: 8, flexWrap: 'wrap' }]}>
        <Button title="Undo" icon="↩️" small variant="dark" onPress={undo} />
        <Button title="Clear all" icon="🧹" small variant="dark" onPress={() => fill(T.FLOOR)} />
        <Button title="Wall border" icon="🧱" small variant="dark" onPress={() => fill(-1)} />
      </View>

      <P dim style={{ marginTop: 10 }}>
        {kind === 'arena'
          ? 'An arena needs: a survivor spawn (S), a zombie spawn (Z) and at least 3 task stations.'
          : 'A course needs: a start (S) and a finish line (F). Add traps, saws and checkpoints.'}
      </P>
      {errors.length ? (
        <Card style={{ marginTop: 10, borderColor: colors.blood }}>
          <H size={15} style={{ color: colors.blood }}>
            Needs fixing:
          </H>
          {errors.map((e) => (
            <P key={e}>• {e}</P>
          ))}
        </Card>
      ) : null}
      {saved?.shareCode ? (
        <Card style={{ marginTop: 10, alignItems: 'center' }} highlight={colors.toxic}>
          <P dim>Share code</P>
          <Text style={styles.code}>{saved.shareCode}</Text>
        </Card>
      ) : null}

      <View style={[styles.row, { marginTop: 14, gap: 10 }]}>
        <Button title="Save" icon="💾" onPress={save} loading={saving} style={{ flex: 1 }} />
        <Button title="Share" icon="📤" variant="blue" onPress={share} style={{ flex: 1 }} />
        <Button title="Test" icon="▶️" variant="gold" onPress={testPlay} style={{ flex: 1 }} />
      </View>
      </View>
      {isDesktop ? <View style={{ flex: 1 }}>{canvas}</View> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, textAlign: 'left' },
  label: { color: colors.text, fontWeight: '700' },
  tools: { flexDirection: 'row', gap: 8, paddingVertical: 10 },
  tool: { width: 74, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, alignItems: 'center', gap: 4 },
  toolSwatch: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { color: colors.text, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  code: { color: colors.toxic, fontSize: 30, fontWeight: '900', letterSpacing: 6 },
});
