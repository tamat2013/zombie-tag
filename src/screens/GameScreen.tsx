// The match itself: runs the engine in a requestAnimationFrame loop, renders the world with a
// fog-of-war circle, and wires input, abilities, tasks and networking together.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { AbilityId, GameMap } from '../types';
import { T } from '../types';
import type { ScreenProps } from '../navigation/types';
import { GameEngine } from '../engine/GameEngine';
import type { EngineEvent, MoveInput } from '../engine/GameEngine';
import { ABILITIES, AbilityManager } from '../engine/abilities';
import type { EffectKey, EnginePlayer } from '../engine/entities';
import { isActive } from '../engine/entities';
import { findTiles, mergeTiles } from '../engine/map';
import type { TaskStation } from '../engine/map';
import { NETWORK_SEND_HZ, PLAYER_RADIUS, SAW_RADIUS, TILE } from '../engine/constants';
import { FirebaseTransport, LocalTransport } from '../services/matchTransport';
import type { MatchTransport } from '../services/matchTransport';
import { roomService } from '../services/roomService';
import { tournamentService } from '../services/tournamentService';
import { applyMatchResult, formatSeconds } from '../logic/progression';
import { ZOMBIE_FILTERS } from '../data/catalog';
import { useGame } from '../state/GameContext';
import { Character } from '../components/Character';
import { Joystick } from '../components/Joystick';
import { AbilityButton } from '../components/AbilityButton';
import { RoleReveal } from '../components/RoleReveal';
import { MapPreview } from '../components/MapPreview';
import { Button } from '../components/Button';
import { TaskModal } from '../tasks/TaskModal';
import { TASK_INFO } from '../tasks/TaskGames';
import { colors, tileColors } from '../theme';
import { haptic } from '../utils/haptics';

const ABILITY_EFFECT: Record<AbilityId, EffectKey> = {
  sprint: 'sprint',
  scan: 'scan',
  medic: 'shield',
  invisibility: 'invisible',
  dash: 'dash',
  zombieVision: 'vision',
  roar: 'slowed',
};

interface FeedItem {
  id: number;
  text: string;
  color: string;
}

// ---- Static map layer ------------------------------------------------------------------------

const TileLayer = React.memo(function TileLayer({ map }: { map: GameMap }) {
  const content = useMemo(() => {
    const out: React.ReactNode[] = [];
    let k = 0;
    const solid = (code: number, style: object) =>
      mergeTiles(map, code).forEach((r) => out.push(<View key={k++} style={[{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }, style]} />));
    solid(T.MUD, { backgroundColor: tileColors[T.MUD] });
    solid(T.HAZARD, { backgroundColor: tileColors[T.HAZARD], borderWidth: 2, borderColor: '#ff6b5f' });
    solid(T.SURVIVOR_SPAWN, { backgroundColor: 'rgba(79,142,247,0.18)' });
    solid(T.ZOMBIE_SPAWN, { backgroundColor: 'rgba(229,56,59,0.2)' });
    solid(T.WALL, { backgroundColor: tileColors[T.WALL], borderTopWidth: 4, borderTopColor: '#53664f', borderBottomWidth: 3, borderBottomColor: '#222b21' });
    for (const t of findTiles(map, T.CRATE)) {
      out.push(
        <View key={k++} style={[styles.crate, { left: t.x * TILE + 3, top: t.y * TILE + 3 }]}>
          <View style={styles.crateBar} />
        </View>,
      );
    }
    for (const t of findTiles(map, T.HAZARD)) {
      out.push(
        <Text key={k++} style={[styles.tileEmoji, { left: t.x * TILE, top: t.y * TILE + 10 }]}>
          ☢️
        </Text>,
      );
    }
    for (const t of findTiles(map, T.CHECKPOINT)) {
      out.push(<View key={k++} style={{ position: 'absolute', left: t.x * TILE, top: t.y * TILE, width: TILE, height: TILE, backgroundColor: 'rgba(45,106,79,0.6)' }} />);
      out.push(
        <Text key={k++} style={[styles.tileEmoji, { left: t.x * TILE, top: t.y * TILE + 10 }]}>
          🚩
        </Text>,
      );
    }
    for (const t of findTiles(map, T.FINISH)) {
      out.push(
        <View key={k++} style={{ position: 'absolute', left: t.x * TILE, top: t.y * TILE, width: TILE, height: TILE, backgroundColor: (t.x + t.y) % 2 ? '#f5f5f5' : '#222' }} />,
      );
    }
    for (const t of findTiles(map, T.SAW)) {
      out.push(<View key={k++} style={{ position: 'absolute', left: t.x * TILE - TILE * 3, top: t.y * TILE + TILE / 2 - 2, width: TILE * 7, height: 4, backgroundColor: '#555', borderRadius: 2 }} />);
    }
    return out;
  }, [map]);
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: map.width * TILE, height: map.height * TILE, backgroundColor: tileColors[T.FLOOR] }}>
      {/* floor grid hint */}
      {Array.from({ length: Math.floor(map.width / 4) }, (_, i) => (
        <View key={`g${i}`} style={{ position: 'absolute', left: i * 4 * TILE, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.03)' }} />
      ))}
      {content}
    </View>
  );
});

function StationView({ s, done, mine }: { s: TaskStation; done: boolean; mine: boolean }) {
  return (
    <View style={[styles.station, { left: s.tx * TILE + 2, top: s.ty * TILE + 2, borderColor: done ? colors.toxic : mine ? colors.gold : '#5aa9e6' }]}>
      <Text style={{ fontSize: 22 }}>{done ? '✅' : TASK_INFO[s.type].icon}</Text>
    </View>
  );
}

// ---- Screen ----------------------------------------------------------------------------------

export function GameScreen({ route, navigation }: ScreenProps<'Game'>) {
  const { setup } = route.params;
  const { profile, updateProfile, toast } = useGame();
  const dims = useWindowDimensions();

  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine({
      map: setup.map,
      mode: setup.flow.mode,
      roster: setup.roster,
      localId: setup.localId,
      isAuthority: setup.isAuthority,
      startTime: setup.startTime,
      durationSec: setup.durationSec,
      difficulty: setup.difficulty,
      seed: setup.seed,
    });
  }
  const engine = engineRef.current;
  const transportRef = useRef<MatchTransport | null>(null);
  if (!transportRef.current) transportRef.current = setup.roomCode ? new FirebaseTransport(setup.roomCode, setup.localId) : new LocalTransport();
  const transport = transportRef.current;

  const input = useRef<MoveInput>({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const [, setFrame] = useState(0);
  const [task, setTask] = useState<TaskStation | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const feedId = useRef(0);
  const finishing = useRef(false);
  const allowLeave = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const taskRef = useRef(task);
  taskRef.current = task;

  const pushFeed = useCallback((text: string, color: string = colors.text) => {
    const id = ++feedId.current;
    setFeed((f) => [...f.slice(-3), { id, text, color }]);
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 3500);
  }, []);

  const nameOf = useCallback((id: string | null) => (id ? engine.getPlayer(id)?.name ?? '???' : 'מלכודת'), [engine]);

  const handleEvent = useCallback(
    (e: EngineEvent) => {
      const me = engine.localId;
      switch (e.type) {
        case 'infected':
          if (e.victimId === me) {
            haptic('heavy');
            setFlash(colors.blood);
            setTimeout(() => setFlash(null), 450);
            setTask(null);
            pushFeed('נדבקת! עכשיו אתה זומבי – הדבק את כולם 🧟', colors.zombie);
          } else if (e.byId === me) {
            haptic('success');
            pushFeed(`הדבקת את ${nameOf(e.victimId)}! 🧟`, colors.zombie);
          } else {
            pushFeed(`${nameOf(e.victimId)} הפך לזומבי`, colors.blood);
          }
          break;
        case 'cured':
          if (e.playerId === me) pushFeed(`${nameOf(e.byId)} ריפא אותך! 💊`, colors.survivor);
          else pushFeed(`${nameOf(e.byId)} ריפא את ${nameOf(e.playerId)} 💊`, colors.survivor);
          break;
        case 'blocked':
          if (e.playerId === me) pushFeed('שריון הטנק חסם את ההדבקה! 🛡️', colors.gold);
          break;
        case 'task':
          if (e.playerId === me) {
            haptic('success');
            pushFeed(`${TASK_INFO[e.taskType].title} הושלמה ✔️`, colors.toxic);
          }
          break;
        case 'checkpoint':
          if (e.playerId === me) pushFeed('נקודת שמירה! 🚩', colors.toxic);
          break;
        case 'hazard':
          if (e.playerId === me) {
            haptic('error');
            setFlash('#ff6b00');
            setTimeout(() => setFlash(null), 300);
            pushFeed('אאוץ׳! חזרת לנקודת השמירה', colors.blood);
          }
          break;
        case 'released':
          haptic('medium');
          pushFeed('הזומבים שוחררו! 🧟‍♂️', colors.blood);
          break;
        default:
          break;
      }
    },
    [engine, nameOf, pushFeed],
  );

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    setTask(null);
    setTimeout(() => {
      const p = profileRef.current;
      if (!p) return;
      const result = engine.result(setup.flow.tournamentId);
      const applied = applyMatchResult(p, result, Date.now(), setup.map.medalTimes);
      updateProfile(applied.profile);
      if (applied.tournamentPointsGained > 0 && setup.flow.tournamentId) {
        tournamentService.addPoints(setup.flow.tournamentId, applied.profile, applied.tournamentPointsGained);
      }
      transport.close();
      allowLeave.current = true;
      navigation.replace('Results', {
        result,
        rewards: applied.rewards,
        levelBefore: applied.levelBefore,
        levelAfter: applied.levelAfter,
        achievementIds: applied.newAchievements.map((a) => a.id),
        tournamentPoints: applied.tournamentPointsGained,
        flow: setup.flow,
        map: setup.map,
        roomCode: setup.roomCode,
        players: engine.players.map((pl) => ({
          name: pl.name,
          role: pl.role,
          startRole: pl.startRole,
          skin: pl.skin,
          isBot: pl.isBot,
          infections: pl.infections,
          tasks: pl.completedStations.length,
          isLocal: pl.id === engine.localId,
        })),
      });
    }, 1800);
  }, [engine, navigation, setup, transport, updateProfile]);

  // Networking hooks.
  useEffect(() => {
    if (!transport.networked) return;
    transport.onState((id, s) => engine.applyRemoteState(id, s));
    transport.onBuff(
      engine.ownedPlayers().map((p) => p.id),
      (b) => engine.applyBuff(b.targetId, b.kind, b.durationMs, b.fromId),
    );
    transport.onEnd((w) => engine.forceEnd(w));
    transport.onPlayerLeft((id) => {
      const p = engine.getPlayer(id);
      if (p && p.control === 'remote') {
        engine.removePlayer(id);
        pushFeed(`${p.name} עזב את המשחק`, colors.textDim);
      }
    });
    return () => transport.close();
  }, [engine, transport, pushFeed]);

  // Main loop.
  useEffect(() => {
    let raf = 0;
    let lastRender = 0;
    let lastSend = 0;
    let announced = false;
    const step = () => {
      const now = transport.serverNow();
      if (now >= engine.startTime) {
        const k = keys.current;
        let mx = input.current.x;
        let my = input.current.y;
        if (k.size) {
          mx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
          my = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
        }
        engine.update(now, { x: mx, y: my });
        for (const e of engine.drainEvents()) handleEvent(e);
        if (transport.networked) {
          for (const b of engine.drainOutbox()) transport.sendBuff(b);
          if (now - lastSend > 1000 / NETWORK_SEND_HZ) {
            lastSend = now;
            transport.publish(Object.fromEntries(engine.ownedPlayers().map((p) => [p.id, engine.serialize(p)])));
          }
        }
        if (engine.ended) {
          if (setup.isAuthority && transport.networked && !announced && engine.ended.winner !== 'finish') {
            announced = true;
            transport.announceEnd(engine.ended.winner);
          }
          finish();
        }
      }
      if (now - lastRender > 33) {
        lastRender = now;
        setFrame((f) => (f + 1) % 1e6);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [engine, transport, handleEvent, finish, setup.isAuthority]);

  // Keyboard controls on web: WASD / arrows to move, 1-3 abilities, E or Space for tasks.
  const useAbilityRef = useRef<(id: AbilityId) => void>(() => {});
  const openTaskRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = (globalThis as unknown as { document?: { addEventListener: (t: string, f: (e: { key: string; preventDefault(): void }) => void) => void; removeEventListener: (t: string, f: (e: { key: string; preventDefault(): void }) => void) => void } }).document;
    if (!doc) return;
    const down = (e: { key: string; preventDefault(): void }) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keys.current.add(key);
        e.preventDefault();
      }
      const local = engine.local;
      if (local && ['1', '2', '3'].includes(key)) {
        const id = AbilityManager.available(local)[Number(key) - 1];
        if (id) useAbilityRef.current(id);
      }
      if (key === 'e' || key === ' ') openTaskRef.current();
    };
    const up = (e: { key: string; preventDefault(): void }) => keys.current.delete(e.key.toLowerCase());
    doc.addEventListener('keydown', down);
    doc.addEventListener('keyup', up);
    return () => {
      doc.removeEventListener('keydown', down);
      doc.removeEventListener('keyup', up);
    };
  }, [engine]);

  // Leaving mid-match asks for confirmation.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (allowLeave.current) return;
        e.preventDefault();
        setConfirmExit(true);
      }),
    [navigation],
  );

  const exitMatch = () => {
    allowLeave.current = true;
    transport.close();
    if (setup.roomCode) roomService.leave(setup.roomCode, setup.localId).catch(() => {});
    navigation.popToTop();
  };

  const useAbility = (id: AbilityId) => {
    if (engine.useAbility(id)) {
      haptic('medium');
      if (id === 'scan') pushFeed('סורק: כל הזומבים נחשפו! 📡', colors.survivor);
      if (id === 'zombieVision') pushFeed('ראיית זומבי: רואה דרך קירות 👁️', colors.zombie);
      if (id === 'medic') pushFeed('מגן רפואי הופעל 💊', colors.survivor);
      if (id === 'roar') pushFeed('שאגה! שורדים קרובים מואטים 📢', colors.zombie);
    }
  };
  useAbilityRef.current = useAbility;

  const station = engine.usableStation();
  const openTask = () => {
    if (station && !taskRef.current) {
      engine.setInTask(true);
      setTask(station);
    }
  };
  openTaskRef.current = openTask;

  // Browser test hook: exposes the running match only when the web page URL contains "e2e".
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const g = globalThis as unknown as { location?: { search: string }; __zombieE2E?: unknown };
    if (!g.location?.search.includes('e2e')) return;
    g.__zombieE2E = { engine, openTask: () => openTaskRef.current(), task: () => taskRef.current };
    return () => {
      g.__zombieE2E = undefined;
    };
  }, [engine]);

  const completeTask = useCallback(() => {
    const s = taskRef.current;
    const local = engine.local;
    if (s && local) engine.completeTask(local, s.index);
    setTask(null);
  }, [engine]);

  const closeTask = useCallback(() => {
    engine.setInTask(false);
    setTask(null);
  }, [engine]);

  // ---- Render --------------------------------------------------------------------------------
  const local = engine.local;
  if (!local) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const now = engine.now;
  const realNow = transport.serverNow();
  const beforeStart = realNow < engine.startTime;
  const mode = engine.mode;
  const obstacle = mode === 'obstacle';
  const zoom = Math.max(0.55, Math.min(1.15, dims.height / (TILE * 8.5)));
  const worldW = engine.map.width * TILE;
  const worldH = engine.map.height * TILE;
  const tx = dims.width / 2 - worldW / 2 - (local.x - worldW / 2) * zoom;
  const ty = dims.height / 2 - worldH / 2 - (local.y - worldH / 2) * zoom;
  const worldTransform = [{ translateX: tx }, { translateY: ty }, { scale: zoom }];
  const filter = ZOMBIE_FILTERS.find((f) => f.id === profile?.equippedFilter) ?? ZOMBIE_FILTERS[0];
  const isZombie = local.role === 'zombie';
  const visionPx = engine.visionRadius(local) * zoom;
  const fogBorder = Math.max(dims.width, dims.height) * 1.5;
  const { survivors, zombies } = engine.counts();
  const myTasks = local.completedStations.filter((i) => i >= 0).length;
  const releaseIn = Math.max(0, engine.releaseAt - now) / 1000;
  const zombieNear = engine.players.some((p) => p.role === 'zombie' && engine.canSee(local, p, now) && Math.hypot(p.x - local.x, p.y - local.y) < 260);

  const visiblePlayers = engine.players.filter((p) => p === local || engine.canSee(local, p, now));

  // Arrow towards the nearest unfinished task (survivors) when it's off-screen.
  let arrow: { angle: number } | null = null;
  if (!isZombie && !obstacle) {
    let best: TaskStation | null = null;
    let bd = Infinity;
    for (const s of engine.stations) {
      if (local.completedStations.includes(s.index)) continue;
      const d = Math.hypot(s.x - local.x, s.y - local.y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    if (best && bd * zoom > visionPx * 0.9) arrow = { angle: Math.atan2(best.y - local.y, best.x - local.x) };
  }

  const timeText = obstacle ? formatSeconds(engine.elapsedMs / 1000) : formatSeconds(engine.timeLeftMs / 1000);
  const abilities = AbilityManager.available(local);
  const suggested = engine.suggestedAbility();

  return (
    <View style={styles.root}>
      {/* World */}
      <View style={[styles.world, { width: worldW, height: worldH, transform: worldTransform }]} pointerEvents="none">
        <TileLayer map={engine.map} />
        {engine.stations.map((s) => (
          <StationView key={s.index} s={s} done={local.completedStations.includes(s.index)} mine={station?.index === s.index} />
        ))}
        {engine.sawPositions.map((s, i) => (
          <View key={i} style={[styles.saw, { left: s.x - SAW_RADIUS, top: s.y - SAW_RADIUS, transform: [{ rotate: `${(now / 3) % 360}deg` }] }]}>
            <Text style={{ fontSize: 26, lineHeight: 34 }}>⚙️</Text>
          </View>
        ))}
      </View>

      {/* Fog of war */}
      {!obstacle ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: dims.width / 2 - visionPx - fogBorder,
            top: dims.height / 2 - visionPx - fogBorder,
            width: (visionPx + fogBorder) * 2,
            height: (visionPx + fogBorder) * 2,
            borderRadius: visionPx + fogBorder,
            borderWidth: fogBorder,
            borderColor: isZombie ? `${filter.vignette}f0` : 'rgba(3,5,3,0.93)',
          }}
        />
      ) : null}
      {!obstacle ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: dims.width / 2 - visionPx - 2,
            top: dims.height / 2 - visionPx - 2,
            width: visionPx * 2 + 4,
            height: visionPx * 2 + 4,
            borderRadius: visionPx + 2,
            borderWidth: 26,
            borderColor: isZombie ? `${filter.vignette}80` : 'rgba(3,5,3,0.45)',
          }}
        />
      ) : null}

      {/* Players are drawn above the fog; visibility is decided by the engine (sight, scan, vision). */}
      <View style={[styles.world, { width: worldW, height: worldH, transform: worldTransform }]} pointerEvents="none">
        {visiblePlayers.map((p) => (
          <PlayerSprite key={p.id} p={p} now={now} isLocal={p === local} localRole={local.role} />
        ))}
      </View>

      {/* Zombie screen filter */}
      {isZombie ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: filter.color, opacity: filter.opacity }]} /> : null}
      {isActive(local, 'vision', now) ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#ff0000', opacity: 0.08 }]} /> : null}
      {isActive(local, 'scan', now) ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 4, borderColor: colors.survivor, opacity: 0.6 }]} /> : null}
      {flash ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flash, opacity: 0.35 }]} /> : null}

      {arrow ? (
        <View
          pointerEvents="none"
          style={[
            styles.arrow,
            {
              left: dims.width / 2 + Math.cos(arrow.angle) * Math.min(dims.width, dims.height) * 0.38 - 18,
              top: dims.height / 2 + Math.sin(arrow.angle) * Math.min(dims.width, dims.height) * 0.38 - 18,
              transform: [{ rotate: `${arrow.angle}rad` }],
            },
          ]}
        >
          <Text style={styles.arrowText}>➤</Text>
        </View>
      ) : null}

      {/* Joystick: left 55% of the screen */}
      <View style={[styles.joyZone, { width: dims.width * 0.55 }]}>
        <Joystick output={input} />
      </View>

      {/* HUD: top */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.topLeft} pointerEvents="box-none">
          {showMinimap && !obstacle ? (
            <Pressable onPress={() => setShowMinimap(false)}>
              <MiniMap engine={engine} local={local} visible={visiblePlayers} />
            </Pressable>
          ) : (
            <Pressable style={styles.smallBtn} onPress={() => setShowMinimap(true)}>
              <Text style={styles.smallBtnText}>🗺️</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.topCenter} pointerEvents="none">
          <Text style={[styles.timer, !obstacle && engine.timeLeftMs < 30000 && { color: colors.blood }]}>{timeText}</Text>
          {obstacle ? (
            <Text style={styles.counts}>
              💀 {local.deaths}
              {engine.map.medalTimes ? `   🥇 ${engine.map.medalTimes[0]}ש׳  🥈 ${engine.map.medalTimes[1]}ש׳  🥉 ${engine.map.medalTimes[2]}ש׳` : ''}
            </Text>
          ) : (
            <Text style={styles.counts}>
              🧍 {survivors}   🧟 {zombies}   🔧 {myTasks}/{engine.stations.length}
            </Text>
          )}
          <Text style={[styles.roleTag, { color: isZombie ? colors.zombie : colors.survivor }]}>
            {obstacle ? 'מסלול מכשולים' : isZombie ? 'זומבי' : 'שורד'}
            {mode === 'training' ? ' · אימון' : mode === 'tournament' ? ' · טורניר' : ''}
          </Text>
        </View>
        <View style={styles.topRight}>
          <Pressable style={styles.smallBtn} onPress={() => setConfirmExit(true)}>
            <Text style={styles.smallBtnText}>✕</Text>
          </Pressable>
        </View>
      </View>

      {!obstacle && !beforeStart && releaseIn > 0 ? (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerText}>
            {local.startRole === 'zombie' ? 'מתכונן לצאת לצוד...' : 'ברחו! הזומבים משתחררים בעוד'} {Math.ceil(releaseIn)}
          </Text>
        </View>
      ) : null}

      {/* Event feed */}
      <View style={styles.feed} pointerEvents="none">
        {feed.map((f) => (
          <Text key={f.id} style={[styles.feedText, { color: f.color }]}>
            {f.text}
          </Text>
        ))}
      </View>

      {/* HUD: abilities + action */}
      <View style={styles.actions} pointerEvents="box-none">
        {station && !task ? (
          <Pressable onPress={openTask} style={({ pressed }) => [styles.useBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Text style={{ fontSize: 30 }}>{TASK_INFO[station.type].icon}</Text>
            <Text style={styles.useText}>{TASK_INFO[station.type].title}</Text>
          </Pressable>
        ) : null}
        <View style={styles.abilityRow}>
          {abilities.map((id, i) => {
            const rem = AbilityManager.remainingMs(local, id, now);
            const total = AbilityManager.cooldownMs(local, id, engine);
            return (
              <AbilityButton
                key={id}
                def={ABILITIES[id]}
                cooldown={total > 0 ? rem / total : 0}
                remainingSec={rem / 1000}
                active={isActive(local, ABILITY_EFFECT[id], now)}
                suggested={suggested === id}
                disabled={!!engine.ended || beforeStart}
                onPress={() => useAbility(id)}
                hotkey={Platform.OS === 'web' ? String(i + 1) : undefined}
              />
            );
          })}
        </View>
      </View>

      {task ? <TaskModal type={task.type} speed={local.mods.task} onComplete={completeTask} onClose={closeTask} danger={zombieNear} /> : null}

      {beforeStart ? <RoleReveal role={local.role} skin={local.skin} outfit={local.outfit} mode={mode} secondsLeft={(engine.startTime - realNow) / 1000} /> : null}

      {engine.ended ? (
        <View style={styles.endOverlay} pointerEvents="none">
          <Text style={[styles.endText, { color: engine.ended.winner === 'zombie' ? colors.zombie : engine.ended.winner === 'finish' ? colors.gold : colors.survivor }]}>
            {engine.ended.winner === 'finish' ? 'סיימת! 🏁' : engine.ended.winner === 'zombie' ? 'הזומבים ניצחו! 🧟' : 'השורדים ניצחו! 🧍'}
          </Text>
        </View>
      ) : null}

      {confirmExit ? (
        <View style={styles.confirm}>
          <View style={styles.confirmPanel}>
            <Text style={styles.confirmTitle}>לצאת מהמשחק?</Text>
            <Text style={styles.confirmSub}>לא תקבל תגמולים על המשחק הזה.</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <Button title="המשך לשחק" variant="dark" onPress={() => setConfirmExit(false)} />
              <Button title="צא" variant="danger" onPress={exitMatch} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PlayerSprite({ p, now, isLocal, localRole }: { p: EnginePlayer; now: number; isLocal: boolean; localRole: string }) {
  const size = PLAYER_RADIUS * 2;
  const invisible = isActive(p, 'invisible', now);
  const zombie = p.role === 'zombie';
  const respawning = p.respawnUntil > now;
  return (
    <View style={{ position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, width: size, height: size }}>
      {zombie ? <View style={[styles.aura, { backgroundColor: isActive(p, 'dash', now) ? 'rgba(255,220,0,0.35)' : 'rgba(124,255,79,0.18)' }]} /> : null}
      {isActive(p, 'sprint', now) ? <View style={[styles.aura, { backgroundColor: 'rgba(79,195,247,0.3)' }]} /> : null}
      {isActive(p, 'slowed', now) ? <Text style={styles.status}>🐌</Text> : null}
      {p.inTask ? <Text style={styles.status}>🔧</Text> : null}
      <Character
        skin={p.skin}
        size={size}
        role={p.role}
        outfit={p.outfit}
        facing={p.facing}
        shielded={isActive(p, 'shield', now)}
        ghosted={invisible || respawning}
      />
      <Text
        numberOfLines={1}
        style={[styles.name, { color: isLocal ? colors.gold : zombie ? colors.zombie : localRole === 'zombie' ? colors.blood : colors.survivor }]}
      >
        {p.name}
      </Text>
    </View>
  );
}

function MiniMap({ engine, local, visible }: { engine: GameEngine; local: EnginePlayer; visible: EnginePlayer[] }) {
  const W = 150;
  const k = W / (engine.map.width * TILE);
  return (
    <View style={styles.minimap}>
      <MapPreview map={engine.map} width={W} />
      {engine.stations.map((s) => (
        <View
          key={s.index}
          style={[styles.mmDot, { left: s.x * k - 2.5, top: s.y * k - 2.5, backgroundColor: local.completedStations.includes(s.index) ? colors.toxic : colors.gold }]}
        />
      ))}
      {visible.map((p) => (
        <View
          key={p.id}
          style={[
            styles.mmDot,
            { width: 7, height: 7, left: p.x * k - 3.5, top: p.y * k - 3.5, backgroundColor: p === local ? '#fff' : p.role === 'zombie' ? colors.blood : colors.survivor },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030503', overflow: 'hidden' },
  world: { position: 'absolute', left: 0, top: 0 },
  crate: { position: 'absolute', width: TILE - 6, height: TILE - 6, backgroundColor: tileColors[T.CRATE], borderWidth: 3, borderColor: '#4a3418', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  crateBar: { width: '120%', height: 4, backgroundColor: '#4a3418', transform: [{ rotate: '45deg' }] },
  tileEmoji: { position: 'absolute', width: TILE, textAlign: 'center', fontSize: 20 },
  station: { position: 'absolute', width: TILE - 4, height: TILE - 4, borderRadius: 8, backgroundColor: tileColors[T.TASK], borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  saw: { position: 'absolute', width: SAW_RADIUS * 2, height: SAW_RADIUS * 2, borderRadius: SAW_RADIUS, backgroundColor: '#9ca3af', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e5e7eb' },
  aura: { position: 'absolute', left: -8, top: -8, right: -8, bottom: -8, borderRadius: 40 },
  status: { position: 'absolute', top: -26, left: 20, fontSize: 14 },
  name: { position: 'absolute', top: PLAYER_RADIUS * 2 + 2, left: -30, width: PLAYER_RADIUS * 2 + 60, textAlign: 'center', fontSize: 11, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 3 },
  joyZone: { position: 'absolute', left: 0, bottom: 0, top: 90 },
  topBar: { position: 'absolute', top: 8, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topLeft: { width: 160 },
  topCenter: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 14 },
  topRight: { width: 160, alignItems: 'flex-end' },
  timer: { color: colors.text, fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
  counts: { color: colors.text, fontSize: 13, fontWeight: '800' },
  roleTag: { fontSize: 12, fontWeight: '900' },
  smallBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  smallBtnText: { color: colors.text, fontSize: 18, fontWeight: '900' },
  minimap: { borderWidth: 2, borderColor: colors.border, borderRadius: 6, opacity: 0.85 },
  mmDot: { position: 'absolute', width: 5, height: 5, borderRadius: 4 },
  banner: { position: 'absolute', top: 92, alignSelf: 'center', backgroundColor: 'rgba(139,30,32,0.85)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12 },
  bannerText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  feed: { position: 'absolute', right: 12, top: 64, alignItems: 'flex-end', gap: 3, maxWidth: '40%' },
  feedText: { fontWeight: '900', fontSize: 13, textShadowColor: '#000', textShadowRadius: 4, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  actions: { position: 'absolute', right: 10, bottom: 12, alignItems: 'flex-end', gap: 10 },
  abilityRow: { flexDirection: 'row', gap: 4 },
  useBtn: { backgroundColor: 'rgba(42,111,151,0.95)', borderColor: colors.gold, borderWidth: 3, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', marginRight: 70 },
  useText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  arrow: { position: 'absolute', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: colors.gold, fontSize: 28, textShadowColor: '#000', textShadowRadius: 4 },
  endOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  endText: { fontSize: 46, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 12 },
  confirm: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  confirmPanel: { backgroundColor: colors.panel, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  confirmTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  confirmSub: { color: colors.textDim, marginTop: 6 },
});
