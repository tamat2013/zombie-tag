// Map editor: paint tiles with a finger (or mouse), validate, save, share by code and test-play.
import React, { useMemo, useRef, useState } from 'react';
import { useDevice } from '../utils/device';
import { PanResponder, Share, StyleSheet, Switch } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, TextInput, View } from '../i18n/Layout';
import { tr } from '../i18n/language';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { GameMap } from '../types';
import { T } from '../types';
import { Screen, ScreenHeader, Card, Chip, H, P, Tabs } from '../components/ui';
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

type Pane = 'paint' | 'map' | 'check';

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

// Tiles that carry a letter or an icon. The icons are line glyphs, like everywhere else.
const LETTER_BY_CODE: Record<number, string> = {
  [T.SURVIVOR_SPAWN]: 'S',
  [T.ZOMBIE_SPAWN]: 'Z',
  [T.HAZARD]: '!',
  [T.CHECKPOINT]: 'K',
  [T.FINISH]: 'F',
};

const ICON_BY_CODE: Record<number, string> = {
  [T.TASK]: '🔧',
  [T.SAW]: '⚙',
};

const SIZES = [
  { w: 24, h: 16, label: 'Small' },
  { w: 32, h: 20, label: 'Medium' },
  { w: 40, h: 24, label: 'Large' },
];

function swatch(code: number) {
  return code === T.FINISH ? '#e9c46a' : tileColors[code] ?? tileColors[0];
}

const Cell = React.memo(function Cell({ code, size }: { code: number; size: number }) {
  const letter = LETTER_BY_CODE[code];
  const icon = ICON_BY_CODE[code];
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: swatch(code),
        borderRightWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {letter && size >= 12 ? <Text style={{ fontSize: size * 0.55, color: '#fff', fontWeight: '900', lineHeight: size * 0.8 }}>{letter}</Text> : null}
      {icon && size >= 12 ? <Glyph emoji={icon} size={size * 0.6} color="#fff" /> : null}
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
  const { isDesktop, width, height } = useDevice();
  // A phone held upright stacks the canvas over the controls instead of putting them side by side.
  const stacked = !isDesktop && height > width;

  const [dims, setDims] = useState({ w: editing?.width ?? 32, h: editing?.height ?? 20 });
  const [tiles, setTiles] = useState<number[]>(() => editing?.tiles.slice() ?? createBlankMap(32, 20));
  const [kind, setKind] = useState<GameMap['kind']>(editing?.kind ?? 'arena');
  const [name, setName] = useState(editing?.name ?? 'My map');
  const [isPublic, setIsPublic] = useState(editing?.isPublic ?? true);
  const [tool, setTool] = useState<number>(T.WALL);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<GameMap | null>(editing ?? null);
  const [saving, setSaving] = useState(false);
  const [pane, setPane] = useState<Pane>('paint');
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const history = useRef<number[][]>([]);
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  // The tiles grow or shrink to fit the canvas area, so a small map gets big tiles and a large one still fits on screen.
  const cell = box ? Math.max(4, Math.min(48, Math.floor(Math.min((box.width - 24) / dims.w, (box.height - 24) / dims.h)))) : 12;
  const rows = useMemo(() => {
    const out: number[][] = [];
    for (let y = 0; y < dims.h; y++) out.push(tiles.slice(y * dims.w, (y + 1) * dims.w));
    return out;
  }, [tiles, dims]);

  const measureCanvas = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox((prev) => (prev && prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  };

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
      setPane('check');
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
        r.unlocked.forEach((a) => toast(`New achievement: ${a.title}`, { icon: a.badge, tone: 'good' }));
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
  const currentLabel = tools.find((t) => t.code === tool)?.label;

  const setup = (
    <>
      <TextInput value={name} onChangeText={setName} maxLength={22} style={styles.input} placeholder={tr('Map name')} placeholderTextColor={colors.textMuted} />
      <View style={styles.chips}>
        <Chip label="Arena" active={kind === 'arena'} onPress={() => setKind('arena')} />
        <Chip label="Obstacle course" active={kind === 'obstacle'} onPress={() => setKind('obstacle')} color={colors.blue} />
      </View>
      {!editing ? (
        <View style={styles.chips}>
          {SIZES.map((s) => (
            <Chip key={s.label} label={isDesktop ? `${s.label} ${s.w}×${s.h}` : `${s.w}×${s.h}`} active={dims.w === s.w} onPress={() => resize(s.w, s.h)} color={colors.gold} />
          ))}
        </View>
      ) : null}
      <View style={styles.switchRow}>
        <Text style={styles.label}>Public (shown in Community)</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.toxicDark, false: '#333' }} thumbColor={isPublic ? colors.toxic : '#999'} />
      </View>
    </>
  );

  const actions = (
    <View style={styles.actions}>
      <Button title="Undo" small variant="dark" onPress={undo} />
      <Button title="Clear all" small variant="dark" onPress={() => fill(T.FLOOR)} />
      <Button title="Wall border" small variant="dark" onPress={() => fill(-1)} />
    </View>
  );

  const saveRow = (
    <View style={styles.saveRow}>
      <Button title="Save" icon={isDesktop ? '💾' : undefined} small={!isDesktop} onPress={save} loading={saving} style={styles.grow} />
      <Button title="Share" icon={isDesktop ? '📤' : undefined} variant="blue" small={!isDesktop} onPress={share} style={styles.grow} />
      <Button title="Test" icon={isDesktop ? '▶️' : undefined} variant="gold" small={!isDesktop} onPress={testPlay} style={styles.grow} />
    </View>
  );

  const hint = (
    <P dim style={!isDesktop && styles.hint}>
      {kind === 'arena'
        ? 'An arena needs: a survivor spawn (S), a zombie spawn (Z) and at least 3 task stations.'
        : 'A course needs: a start (S) and a finish line (F). Add traps, saws and checkpoints.'}
    </P>
  );

  const problems = errors.length ? (
    <Card style={styles.problems}>
      <H size={15} style={styles.bloodText}>
        Needs fixing:
      </H>
      {errors.map((e) => (
        <P key={e} style={!isDesktop && styles.hint}>
          • {e}
        </P>
      ))}
    </Card>
  ) : null;

  const shareCard = saved?.shareCode ? (
    <Card style={styles.shareCard} highlight={colors.toxic}>
      <P dim>Share code</P>
      <Text style={styles.code}>{saved.shareCode}</Text>
    </Card>
  ) : null;

  const canvasBox = (
    <View style={styles.canvasBox} onLayout={measureCanvas}>
      <View style={styles.frame}>
        <View {...pan.panHandlers} style={{ width: cell * dims.w, height: cell * dims.h }}>
          <View pointerEvents="none">
            {rows.map((r, y) => (
              <Row key={y} row={r} size={cell} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  // Desktop: setup, every tool with its name, and the save buttons all sit beside the canvas.
  const deskPanel = (
    <View style={styles.panelDesk}>
      <Card style={styles.setupCard}>{setup}</Card>
      <View style={styles.toolWrap}>
        {tools.map((t) => (
          <Pressable key={t.code} onPress={() => setTool(t.code)} style={[styles.tool, tool === t.code && styles.toolOn]}>
            <View style={[styles.toolSwatch, { backgroundColor: swatch(t.code) }]}>
              <Glyph emoji={t.icon} size={16} color="#0d0a1f" />
            </View>
            <Text style={styles.toolLabel}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {actions}
      {hint}
      {problems}
      {shareCard}
      <View style={styles.grow} />
      {saveRow}
    </View>
  );

  // Phone: the canvas stays in view and the controls move into three tabs, so nothing scrolls.
  const paint = (
    <>
      <View style={styles.toolGrid}>
        {tools.map((t) => (
          <Pressable key={t.code} onPress={() => setTool(t.code)} accessibilityLabel={t.label} style={[styles.toolSquare, tool === t.code && styles.toolSquareOn]}>
            <View style={[styles.toolSwatchSmall, { backgroundColor: swatch(t.code) }]}>
              <Glyph emoji={t.icon} size={15} color="#0d0a1f" />
            </View>
          </Pressable>
        ))}
      </View>
      <P dim>{currentLabel}</P>
      {actions}
    </>
  );

  const phonePanel = (
    <View style={stacked ? styles.panelStacked : styles.panelPhone}>
      <Tabs<Pane>
        tabs={[
          { id: 'paint', label: 'Paint' },
          { id: 'map', label: 'Map' },
          { id: 'check', label: 'Check' },
        ]}
        value={pane}
        onChange={setPane}
      />
      <View style={styles.paneBody}>
        {pane === 'paint' ? paint : null}
        {pane === 'map' ? setup : null}
        {pane === 'check' ? (
          <>
            {errors.length ? problems : hint}
            {shareCard}
          </>
        ) : null}
      </View>
      {saveRow}
    </View>
  );

  return (
    <Screen scroll>
      <ScreenHeader title={editing ? 'Edit map' : 'Map creator'} />
      <View style={[styles.split, isDesktop && styles.splitDesk, stacked && styles.splitStacked]}>
        {isDesktop ? deskPanel : canvasBox}
        {isDesktop ? canvasBox : phonePanel}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row', gap: 14 },
  splitDesk: { gap: 28 },
  splitStacked: { flexDirection: 'column', gap: 8 },
  panelDesk: { width: 360, gap: 10 },
  setupCard: { gap: 8 },
  panelPhone: { width: 270, gap: 8 },
  panelStacked: { flex: 1, gap: 8 },
  paneBody: { flex: 1, gap: 8 },
  canvasBox: { flex: 1, minWidth: 0, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  frame: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 6, overflow: 'hidden' },
  input: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, textAlign: 'left' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.text, fontWeight: '700', flexShrink: 1 },
  toolWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: { width: 84, paddingVertical: 4, gap: 3, borderRadius: radius.sm, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  toolOn: { borderColor: colors.toxic, backgroundColor: 'rgba(198,255,61,0.16)' },
  toolSwatch: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { color: colors.text, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  toolSquare: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  toolSquareOn: { borderWidth: 3, borderColor: colors.toxic },
  toolSwatchSmall: { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveRow: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
  hint: { fontSize: 13, lineHeight: 18 },
  problems: { borderColor: colors.blood },
  bloodText: { color: colors.blood },
  shareCard: { alignItems: 'center' },
  code: { color: colors.toxic, fontSize: 30, fontWeight: '900', letterSpacing: 6 },
});
