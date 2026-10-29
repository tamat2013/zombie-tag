// Lobby: set up a match against bots, or create / join an online room and wait for players.
import { useDevice } from '../utils/device';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Pressable, TextInput, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { BotDifficulty, GameMap, MatchRules, Role } from '../types';
import { Screen, ScreenHeader, Card, Chip, H, P, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { MapPreview } from '../components/MapPreview';
import { useGame, useProfile } from '../state/GameContext';
import { findSkin } from '../data/skins';
import { outfitEmoji } from '../data/catalog';
import { ABILITIES } from '../engine/abilities';
import { assignRoles, knockoutRoles } from '../engine/GameEngine';
import { CLASSIC_DURATION_SEC, DEFAULT_RULES, KNOCKOUT_SIZE, TOURNAMENT_ROUND_SEC } from '../engine/constants';
import { isFirebaseConfigured } from '../services/firebase';
import { MAX_ROOM_PLAYERS, knockedOut, roomCapacity, roomService } from '../services/roomService';
import type { Room } from '../services/roomService';
import { getTournamentById, roundName, tournamentStatus } from '../logic/tournaments';
import { localSetup, makeBots, onlineSetup, roomMap, seededRng } from '../utils/matchSetup';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { colors, outline, radius } from '../theme';
import { haptic } from '../utils/haptics';

type Tab = 'bots' | 'online';

const DIFFICULTIES: { id: BotDifficulty; label: string }[] = [
  { id: 'dummy', label: 'Dummies' },
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Hard' },
];

const MODE_TITLE = { classic: 'Lobby · Classic', tournament: 'Lobby · Tournament', obstacle: 'Obstacle Course', training: 'Training' } as const;

export function LobbyScreen({ navigation, route }: ScreenProps<'Lobby'>) {
  const { isDesktop } = useDevice();
  const { flow, map } = route.params;
  const profile = useProfile();
  const { toast } = useGame();
  const onlineCapable = isFirebaseConfigured && (flow.mode === 'classic' || flow.mode === 'tournament');

  const [tab, setTab] = useState<Tab>(route.params.roomCode ? 'online' : 'bots');
  const [botCount, setBotCount] = useState(flow.mode === 'training' ? 4 : 7);
  const [difficulty, setDifficulty] = useState<BotDifficulty>(flow.mode === 'training' ? 'easy' : 'normal');
  const [trainingRole, setTrainingRole] = useState<Role>('survivor');
  const [trainingMinutes, setTrainingMinutes] = useState(5);
  const [rules, setRules] = useState<MatchRules>(DEFAULT_RULES);
  const [classicMinutes, setClassicMinutes] = useState(CLASSIC_DURATION_SEC / 60);

  const tournament = flow.tournamentId ? getTournamentById(flow.tournamentId, Date.now()) : undefined;
  const tournamentClosed = flow.mode === 'tournament' && (!tournament || tournamentStatus(tournament, Date.now()) !== 'live');

  const startLocal = () => {
    if (tournamentClosed) {
      toast('The tournament is not live right now', { tone: 'bad' });
      return;
    }
    haptic('medium');
    const setup = localSetup(profile, flow, map, {
      botCount,
      difficulty,
      trainingRole: flow.mode === 'training' ? trainingRole : undefined,
      durationSec: flow.mode === 'training' ? trainingMinutes * 60 : flow.mode === 'classic' ? classicMinutes * 60 : undefined,
      rules: flow.mode === 'tournament' ? undefined : rules,
    });
    navigation.replace('Game', { setup });
  };

  const skin = findSkin(profile.selectedSkinId, profile.customSkins);

  return (
    <Screen scroll>
      <ScreenHeader title={MODE_TITLE[flow.mode]} />

      <View style={isDesktop ? { flexDirection: 'row', gap: 24, alignItems: 'flex-start' } : undefined}>
      <Card style={[styles.summary, isDesktop && { flexDirection: 'column', width: 320, alignItems: 'stretch' }]}>
        <MapPreview map={map} width={isDesktop ? 290 : 130} />
        <View style={{ flex: 1 }}>
          <H size={17}>{map.name}</H>
          {tournament ? <P dim>{`${tournament.icon} ${tournament.name}`}</P> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Character skin={skin} size={38} outfit={outfitEmoji(profile.equippedOutfit)} />
            <P>{profile.displayName}</P>
          </View>
          <P dim style={{ marginTop: 4 }}>
            {profile.loadout.survivor.map((a) => ABILITIES[a].icon).join(' ')} · {profile.loadout.zombie.map((a) => ABILITIES[a].icon).join(' ')}
          </P>
        </View>
      </Card>

      <View style={isDesktop ? { flex: 1 } : undefined}>
      {onlineCapable ? (
        <Tabs<Tab>
          tabs={[
            { id: 'bots', label: 'Vs bots' },
            { id: 'online', label: 'Online' },
          ]}
          value={tab}
          onChange={setTab}
        />
      ) : null}

      {tab === 'online' && onlineCapable ? (
        <OnlineLobby flow={flow} map={map} initialCode={route.params.roomCode} navigation={navigation} />
      ) : flow.mode === 'obstacle' ? (
        <Card style={{ marginTop: 12 }}>
          <H size={16}>Race the clock</H>
          <P dim style={{ marginTop: 4 }}>
            Reach the finish line. Traps and saws send you back to the last checkpoint. Faster time = better medal.
          </P>
          {map.medalTimes ? (
            <P style={{ marginTop: 6 }}>
              Gold {map.medalTimes[0]}s · Silver {map.medalTimes[1]}s · Bronze {map.medalTimes[2]}s
            </P>
          ) : null}
          <Button title="Start run" icon="🏁" onPress={startLocal} style={{ marginTop: 14 }} />
        </Card>
      ) : (
        <SetupBoard
          mode={flow.mode}
          botCount={botCount}
          onBots={setBotCount}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          trainingRole={trainingRole}
          onTrainingRole={setTrainingRole}
          trainingMinutes={trainingMinutes}
          onTrainingMinutes={setTrainingMinutes}
          rules={rules}
          onRules={(patch) => setRules((r) => ({ ...r, ...patch }))}
          classicMinutes={classicMinutes}
          onClassicMinutes={setClassicMinutes}
          onStart={startLocal}
          startDisabled={tournamentClosed}
        />
      )}
      </View>
      </View>
    </Screen>
  );
}

// ---- Online rooms -----------------------------------------------------------------------------

function OnlineLobby({
  flow,
  map,
  initialCode,
  navigation,
}: {
  flow: ScreenProps<'Lobby'>['route']['params']['flow'];
  map: GameMap;
  initialCode?: string;
  navigation: ScreenProps<'Lobby'>['navigation'];
}) {
  const profile = useProfile();
  const { toast } = useGame();
  const [code, setCode] = useState<string | null>(initialCode ?? null);
  const [room, setRoom] = useState<Room | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [openRooms, setOpenRooms] = useState<Room[] | null>(null);
  const leavingToGame = useRef(false);
  const ignoreStart = useRef<number | null | undefined>(undefined);

  // Leave the room when the lobby closes, unless we are heading into the match.
  const codeRef = useRef(code);
  codeRef.current = code;
  useEffect(
    () => () => {
      if (codeRef.current && !leavingToGame.current) roomService.leave(codeRef.current, profile.uid).catch(() => {});
    },
    [profile.uid],
  );

  useEffect(() => {
    if (!code) return;
    return roomService.subscribe(code, (r) => {
      if (!r) {
        toast('The room was closed', { tone: 'bad' });
        setCode(null);
        setRoom(null);
        return;
      }
      if (!r.players?.[profile.uid]) {
        // Removed from the room (or our join was lost): rejoin if it is still open.
        if (r.status === 'lobby') roomService.join(r.code, profile).catch(() => setCode(null));
      }
      // The first snapshot may still hold the previous match: never jump into that one.
      if (ignoreStart.current === undefined) {
        ignoreStart.current = r.match?.startedAt ?? null;
        if (r.hostId === profile.uid && r.status !== 'lobby') roomService.backToLobby(r.code).catch(() => {});
      }
      setRoom(r);
      if (r.status === 'playing' && r.match && typeof r.match.startedAt === 'number' && r.match.startedAt !== ignoreStart.current) {
        const setup = onlineSetup(r, profile.uid);
        if (setup && !leavingToGame.current) {
          leavingToGame.current = true;
          navigation.replace('Game', { setup });
        }
      }
    });
  }, [code, profile, navigation, toast]);

  const loadOpen = useCallback(() => {
    roomService
      .listOpen()
      .then(setOpenRooms)
      .catch(() => setOpenRooms([]));
  }, []);
  useEffect(() => {
    if (!code) loadOpen();
  }, [code, loadOpen]);

  const create = async () => {
    setBusy(true);
    try {
      const c = await roomService.create(profile, {
        map,
        botCount: 5,
        difficulty: 'normal',
        mode: flow.mode === 'tournament' ? 'tournament' : 'classic',
        tournamentId: flow.tournamentId,
      });
      ignoreStart.current = undefined;
      setCode(c);
      haptic('success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the room', { tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };

  const join = async (c: string) => {
    if (c.trim().length < 5) return;
    setBusy(true);
    try {
      await roomService.join(c, profile);
      ignoreStart.current = undefined;
      setCode(c.trim().toUpperCase());
      haptic('success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not join', { tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    if (code) roomService.leave(code, profile.uid).catch(() => {});
    setCode(null);
    setRoom(null);
  };

  if (!code) {
    return (
      <View style={{ marginTop: 12, gap: 12 }}>
        <Card>
          <H size={16}>Create a new room</H>
          <P dim>
            Friends join with a 5-letter code. Up to {flow.mode === 'tournament' ? KNOCKOUT_SIZE : MAX_ROOM_PLAYERS} players; bots fill empty spots.
          </P>
          <Button title="Create room" icon="➕" onPress={create} loading={busy} style={{ marginTop: 10 }} />
        </Card>
        <Card>
          <H size={16}>Join with a code</H>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <Button title="Join" small variant="blue" onPress={() => join(joinCode)} disabled={busy} />
            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="ABCDE"
              placeholderTextColor={colors.textMuted}
              maxLength={5}
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>
        </Card>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={loadOpen} hitSlop={8}>
              <Icon name="refresh" size={20} color={colors.text} />
            </Pressable>
            <H size={16}>Open rooms</H>
          </View>
          {openRooms === null ? <ActivityIndicator color={colors.toxic} style={{ marginTop: 8 }} /> : null}
          {openRooms?.length === 0 ? <P dim>No open rooms right now. Create one!</P> : null}
          {openRooms?.map((r) => (
            <Pressable key={r.code} onPress={() => join(r.code)} style={styles.openRoom}>
              <Text style={styles.openCount}>
                {Object.keys(r.players ?? {}).length}/{roomCapacity(r)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.openName}>{r.players?.[r.hostId]?.name ?? 'Room'} · {roomMap(r)?.name ?? r.mapId}</Text>
                <Text style={styles.openCode}>{r.code}{r.mode === 'tournament' ? ' · Tournament' : ''}</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      </View>
    );
  }

  if (!room) return <ActivityIndicator color={colors.toxic} style={{ marginTop: 30 }} />;

  const isHost = room.hostId === profile.uid;
  const players = Object.entries(room.players ?? {}).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  const me = room.players?.[profile.uid];
  const knockout = room.mode === 'tournament';
  const alive = room.knockout?.alive?.length ? room.knockout.alive : null;
  const out = knockedOut(room, profile.uid);
  // Between knockout rounds only the players still in take part.
  const inRun = alive ? players.filter(([id]) => alive.includes(id)) : players.slice(0, roomCapacity(room));
  const others = inRun.filter(([id]) => id !== room.hostId);
  const allReady = others.every(([, p]) => p.ready);
  const aliveBots = alive ? Object.fromEntries(Object.entries(room.knockout?.bots ?? {}).filter(([id]) => alive.includes(id))) : null;
  const roomRules: MatchRules = { ...DEFAULT_RULES, ...(room.rules ?? {}) };
  const roomMinutes = (room.durationSec ?? CLASSIC_DURATION_SEC) / 60;
  const bots = aliveBots ? Object.keys(aliveBots).length : knockout ? KNOCKOUT_SIZE - inRun.length : Math.min(room.botCount, MAX_ROOM_PLAYERS - players.length);

  const start = async () => {
    if (inRun.length + bots < 2) {
      toast('Need at least 2 participants (players or bots)', { tone: 'bad' });
      return;
    }
    haptic('heavy');
    const seed = Math.floor(Math.random() * 1e9);
    const rng = seededRng(seed);
    const botMap = aliveBots ?? makeBots(bots, rng, players.map(([, p]) => p.name));
    const ids = [...inRun.map(([id]) => id), ...Object.keys(botMap)];
    const roles = knockout ? knockoutRoles(ids, rng) : assignRoles(ids, rng, undefined, roomRules.zombies);
    try {
      await roomService.start(room.code, {
        startedAt: 0,
        seed,
        roles,
        bots: botMap,
        durationSec: knockout ? TOURNAMENT_ROUND_SEC : roomMinutes * 60,
        rules: knockout ? null : roomRules,
      });
    } catch (e) {
      toast('Could not start', { tone: 'bad' });
      console.warn(e);
    }
  };

  return (
    <View style={{ marginTop: 12, gap: 12 }}>
      <Card highlight={colors.toxic} style={{ alignItems: 'center' }}>
        <P dim>Room code</P>
        <Text style={styles.roomCode}>{room.code}</Text>
        <P dim>
          {inRun.length} players · {bots} bots · {roomMap(room)?.name}
        </P>
        {knockout ? (
          <P style={{ marginTop: 4, color: colors.gold, fontWeight: '800' }}>
            {roundName(inRun.length + bots)} · {TOURNAMENT_ROUND_SEC / 60} min · half zombies, half survivors
          </P>
        ) : null}
      </Card>
      {out ? (
        <Card highlight={colors.blood}>
          <H size={16}>You are out of the tournament</H>
          <P dim>Your team lost the last round. You already got your prize. You can leave the room or wait for the tournament to end.</P>
        </Card>
      ) : null}

      <Card>
        <H size={16}>Players</H>
        {players.map(([id, p]) => (
          <View key={id} style={[styles.player, alive && !alive.includes(id) && { opacity: 0.4 }]}>
            <Text style={[styles.ready, { color: id === room.hostId ? colors.gold : p.ready ? colors.toxic : colors.textMuted }]}>
              {alive && !alive.includes(id) ? 'Out' : id === room.hostId ? 'Host' : p.ready ? 'Ready' : '… Waiting'}
            </Text>
            <Text style={styles.playerName} numberOfLines={1}>
              {p.name}
              {id === profile.uid ? ' (you)' : ''}
            </Text>
            <Character skin={p.skin} size={34} outfit={outfitEmoji(p.outfit)} />
          </View>
        ))}
        {Array.from({ length: bots }, (_, i) => (
          <View key={`b${i}`} style={[styles.player, { opacity: 0.55 }]}>
            <Icon name="robot-outline" size={18} color={colors.textMuted} />
            <Text style={styles.playerName}>Bot</Text>
            <View style={{ width: 34 }} />
          </View>
        ))}
      </Card>

      {out ? null : isHost ? (
        <Card>
          {knockout ? null : (
            <>
              <Label>Bots: {room.botCount}</Label>
              <Stepper value={room.botCount} min={0} max={MAX_ROOM_PLAYERS - 1} onChange={(n) => roomService.updateSettings(room.code, { botCount: n })} />
            </>
          )}
          <Label>Bot level</Label>
          <View style={styles.chips}>
            {DIFFICULTIES.filter((d) => d.id !== 'dummy').map((d) => (
              <Chip key={d.id} label={d.label} active={room.difficulty === d.id} onPress={() => roomService.updateSettings(room.code, { difficulty: d.id })} />
            ))}
          </View>
          {knockout ? null : (
            <RulesEditor
              rules={roomRules}
              onChange={(patch) => roomService.updateSettings(room.code, { rules: { ...roomRules, ...patch } }).catch(() => {})}
              minutes={roomMinutes}
              onMinutes={(m) => roomService.updateSettings(room.code, { durationSec: m * 60 }).catch(() => {})}
            />
          )}
          <Button title={allReady ? 'Start match' : 'Waiting for everyone to be ready'} icon="▶️" onPress={start} disabled={!allReady} style={{ marginTop: 14 }} />
        </Card>
      ) : (
        <>
          {knockout ? null : (
            <Card>
              <H size={16}>Match rules</H>
              <P dim style={{ marginTop: 4 }}>{rulesSummary(roomRules, roomMinutes)}</P>
            </Card>
          )}
          <Button
          title={me?.ready ? 'Not ready' : 'I am ready!'}
          icon={me?.ready ? '✋' : '✅'}
          variant={me?.ready ? 'dark' : 'primary'}
          onPress={() => roomService.setReady(room.code, profile.uid, !me?.ready)}
          />
        </>
      )}
      <Button title="Leave room" icon="🚪" variant="danger" small onPress={leave} />
    </View>
  );
}

// ---- House rules -----------------------------------------------------------------------------

const ZOMBIE_COUNTS = [0, 1, 2, 3];
const RELEASE_DELAYS = [3, 5, 10, 20];
const ZOMBIE_SPEEDS: { v: number; label: string }[] = [
  { v: 0.85, label: 'Slow' },
  { v: 1, label: 'Normal' },
  { v: 1.15, label: 'Fast' },
];
const DOCTOR_COUNTS = [0, 1, 2, 3];
const CLASSIC_MINUTES = [3, 5, 10, 15];

function rulesSummary(r: MatchRules, minutes: number): string {
  const speed = r.zombieSpeed > 1 ? 'fast zombies' : r.zombieSpeed < 1 ? 'slow zombies' : 'normal zombies';
  return [
    `${minutes} min`,
    r.zombies ? `${r.zombies} starting zombies` : 'auto zombies',
    `release after ${r.releaseDelaySec}s`,
    speed,
    `${r.doctors} doctors`,
    r.fastAbilities ? 'fast abilities' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

type Opt = { key: string; label: string; active: boolean; onPress: () => void; color?: string };

/** One setting as a tile: icon + title + current value on top, segmented options below. */
function SettingTile({ icon, title, color, value, opts }: { icon: IconName; title: string; color: string; value?: string; opts: Opt[] }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <View style={[styles.tileIcon, { backgroundColor: color }]}>
          <Icon name={icon} size={18} color={colors.ink} />
        </View>
        <Text style={styles.tileTitle}>{title}</Text>
        {value ? <Text style={[styles.tileValue, { color }]}>{value}</Text> : null}
      </View>
      <View style={styles.seg}>
        {opts.map((o) => (
          <Pressable key={o.key} onPress={o.onPress} style={[styles.segBtn, o.active && { backgroundColor: o.color ?? color }]}>
            <Text style={[styles.segText, o.active && { color: colors.ink }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Match briefing: the whole local setup as a board of setting tiles with one big start bar. */
function SetupBoard(p: {
  mode: 'classic' | 'tournament' | 'obstacle' | 'training';
  botCount: number;
  onBots: (n: number) => void;
  difficulty: BotDifficulty;
  onDifficulty: (d: BotDifficulty) => void;
  trainingRole: Role;
  onTrainingRole: (r: Role) => void;
  trainingMinutes: number;
  onTrainingMinutes: (m: number) => void;
  rules: MatchRules;
  onRules: (patch: Partial<MatchRules>) => void;
  classicMinutes: number;
  onClassicMinutes: (m: number) => void;
  onStart: () => void;
  startDisabled: boolean;
}) {
  const training = p.mode === 'training';
  const tournament = p.mode === 'tournament';
  const rulesOn = p.mode === 'classic' || training;
  const num = (n: number, zero: string) => (n === 0 ? zero : String(n));
  return (
    <View style={{ marginTop: 12, gap: 12 }}>
      {tournament ? (
        <View style={styles.tile}>
          <View style={styles.tileHead}>
            <View style={[styles.tileIcon, { backgroundColor: colors.gold }]}>
              <Icon name="trophy-outline" size={18} color={colors.ink} />
            </View>
            <Text style={styles.tileTitle}>Knockout tournament</Text>
          </View>
          <P dim>
            {KNOCKOUT_SIZE} players, half zombies and half survivors. You advance only if the team you started on wins (even if you got infected along the way). Quarter-final → Semi-final → a 2-player Final. The champion wins the big prize!
          </P>
          <P dim>
            {TOURNAMENT_ROUND_SEC / 60} min per round · faster survivors · slower zombies
          </P>
        </View>
      ) : null}
      <View style={styles.tiles}>
        {training ? (
          <>
            <SettingTile
              icon="account-switch-outline"
              title="Practice as"
              color={colors.survivor}
              opts={[
                { key: 's', label: 'Survivor', active: p.trainingRole === 'survivor', onPress: () => p.onTrainingRole('survivor'), color: colors.survivor },
                { key: 'z', label: 'Zombie', active: p.trainingRole === 'zombie', onPress: () => p.onTrainingRole('zombie'), color: colors.zombie },
              ]}
            />
            <SettingTile icon="timer-outline" title="Duration" color={colors.gold} value={`${p.trainingMinutes} min`} opts={[2, 5, 10].map((m) => ({ key: String(m), label: `${m}`, active: p.trainingMinutes === m, onPress: () => p.onTrainingMinutes(m) }))} />
          </>
        ) : null}
        {!tournament ? (
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <View style={[styles.tileIcon, { backgroundColor: colors.blue }]}>
                <Icon name="robot-outline" size={18} color={colors.ink} />
              </View>
              <Text style={styles.tileTitle}>Bots</Text>
              <Text style={[styles.tileValue, { color: colors.blue }]}>{p.botCount}</Text>
            </View>
            <Stepper value={p.botCount} min={1} max={MAX_ROOM_PLAYERS - 1} onChange={p.onBots} />
          </View>
        ) : null}
        <SettingTile
          icon="speedometer"
          title="Difficulty"
          color={colors.toxic}
          opts={DIFFICULTIES.filter((d) => training || d.id !== 'dummy').map((d) => ({ key: d.id, label: d.label, active: p.difficulty === d.id, onPress: () => p.onDifficulty(d.id), color: d.id === 'hard' ? colors.blood : colors.toxic }))}
        />
        {p.mode === 'classic' ? (
          <SettingTile icon="timer-outline" title="Match length" color={colors.gold} value={`${p.classicMinutes} min`} opts={CLASSIC_MINUTES.map((m) => ({ key: String(m), label: `${m}`, active: p.classicMinutes === m, onPress: () => p.onClassicMinutes(m) }))} />
        ) : null}
        {rulesOn ? (
          <>
            <SettingTile icon="virus-outline" title="Starting zombies" color={colors.zombie} value={num(p.rules.zombies, 'Auto')} opts={ZOMBIE_COUNTS.map((n) => ({ key: String(n), label: num(n, 'Auto'), active: p.rules.zombies === n, onPress: () => p.onRules({ zombies: n }) }))} />
            <SettingTile icon="lock-open-outline" title="Zombies released after" color={colors.blue} value={`${p.rules.releaseDelaySec}s`} opts={RELEASE_DELAYS.map((n) => ({ key: String(n), label: `${n}s`, active: p.rules.releaseDelaySec === n, onPress: () => p.onRules({ releaseDelaySec: n }) }))} />
            <SettingTile icon="run-fast" title="Zombie speed" color={colors.blood} opts={ZOMBIE_SPEEDS.map((z) => ({ key: String(z.v), label: z.label, active: p.rules.zombieSpeed === z.v, onPress: () => p.onRules({ zombieSpeed: z.v }), color: z.v > 1 ? colors.blood : colors.toxic }))} />
            <SettingTile icon="medical-bag" title="Doctors" color={colors.blue} value={num(p.rules.doctors, 'None')} opts={DOCTOR_COUNTS.map((n) => ({ key: String(n), label: num(n, 'None'), active: p.rules.doctors === n, onPress: () => p.onRules({ doctors: n }) }))} />
            {training ? null : (
              <SettingTile
                icon="flash-outline"
                title="Ability recharge"
                color={colors.purple}
                opts={[
                  { key: 'n', label: 'Normal', active: !p.rules.fastAbilities, onPress: () => p.onRules({ fastAbilities: false }) },
                  { key: 'f', label: '2x faster', active: p.rules.fastAbilities, onPress: () => p.onRules({ fastAbilities: true }) },
                ]}
              />
            )}
          </>
        ) : null}
      </View>
      {training ? (
        <P dim>{p.difficulty === 'dummy' ? 'Dummies: bots stand still and never move. Good for target practice.' : 'In training, abilities recharge 2x faster.'}</P>
      ) : null}
      <Button title="Start match" icon="▶️" onPress={p.onStart} disabled={p.startDisabled} />
    </View>
  );
}

// ---- Small controls -------------------------------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
      <View style={styles.stepTrack}>
        {Array.from({ length: max - min + 1 }, (_, i) => (
          <Pressable key={i} onPress={() => onChange(min + i)} style={[styles.stepDot, min + i <= value && { backgroundColor: colors.toxic }]} />
        ))}
      </View>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '47%', minWidth: 240, backgroundColor: colors.panel, borderRadius: radius.lg, padding: 12, gap: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: 'rgba(255,255,255,0.08)' },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 14, textAlign: 'left' },
  tileValue: { fontWeight: '900', fontSize: 18 },
  seg: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: 12, padding: 3, gap: 3 },
  segBtn: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 6 },
  segText: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  summary: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  label: { color: colors.textDim, fontWeight: '800', fontSize: 13, textAlign: 'left', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rules: { marginTop: 14, paddingTop: 12, borderTopWidth: 2, borderTopColor: colors.ink },
  rulesTitle: { color: colors.gold, fontWeight: '900', fontSize: 15, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 1 },
  input: { flex: 1, backgroundColor: colors.bgAlt, borderRadius: radius.sm, ...outline, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 18, textAlign: 'center', letterSpacing: 4 },
  roomCode: { color: colors.toxic, fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ready: { width: 80, fontWeight: '800', fontSize: 12 },
  playerName: { flex: 1, color: colors.text, fontWeight: '800', textAlign: 'left' },
  openRoom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  openCount: { color: colors.toxic, fontWeight: '900', width: 48 },
  openName: { color: colors.text, fontWeight: '800', textAlign: 'left' },
  openCode: { color: colors.textDim, fontSize: 12, textAlign: 'left', letterSpacing: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.panelLight, alignItems: 'center', justifyContent: 'center', ...outline, borderBottomWidth: 4 },
  stepText: { color: colors.text, fontSize: 22, fontWeight: '900' },
  stepTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  stepDot: { flex: 1, height: 14, borderRadius: 3, backgroundColor: colors.bgAlt, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
});

/** Room host's house rules, as the same tiles the local setup board uses. */
function RulesEditor({ rules, onChange, minutes, onMinutes }: { rules: MatchRules; onChange: (patch: Partial<MatchRules>) => void; minutes: number; onMinutes: (m: number) => void }) {
  const num = (n: number, zero: string) => (n === 0 ? zero : String(n));
  return (
    <View style={[styles.tiles, { marginTop: 12 }]}>
      <SettingTile icon="timer-outline" title="Match length" color={colors.gold} value={`${minutes} min`} opts={CLASSIC_MINUTES.map((m) => ({ key: String(m), label: `${m}`, active: minutes === m, onPress: () => onMinutes(m) }))} />
      <SettingTile icon="virus-outline" title="Starting zombies" color={colors.zombie} value={num(rules.zombies, 'Auto')} opts={ZOMBIE_COUNTS.map((n) => ({ key: String(n), label: num(n, 'Auto'), active: rules.zombies === n, onPress: () => onChange({ zombies: n }) }))} />
      <SettingTile icon="lock-open-outline" title="Zombies released after" color={colors.blue} value={`${rules.releaseDelaySec}s`} opts={RELEASE_DELAYS.map((n) => ({ key: String(n), label: `${n}s`, active: rules.releaseDelaySec === n, onPress: () => onChange({ releaseDelaySec: n }) }))} />
      <SettingTile icon="run-fast" title="Zombie speed" color={colors.blood} opts={ZOMBIE_SPEEDS.map((z) => ({ key: String(z.v), label: z.label, active: rules.zombieSpeed === z.v, onPress: () => onChange({ zombieSpeed: z.v }), color: z.v > 1 ? colors.blood : colors.toxic }))} />
      <SettingTile icon="medical-bag" title="Doctors" color={colors.blue} value={num(rules.doctors, 'None')} opts={DOCTOR_COUNTS.map((n) => ({ key: String(n), label: num(n, 'None'), active: rules.doctors === n, onPress: () => onChange({ doctors: n }) }))} />
      <SettingTile
        icon="flash-outline"
        title="Ability recharge"
        color={colors.purple}
        opts={[
          { key: 'n', label: 'Normal', active: !rules.fastAbilities, onPress: () => onChange({ fastAbilities: false }) },
          { key: 'f', label: '2x faster', active: rules.fastAbilities, onPress: () => onChange({ fastAbilities: true }) },
        ]}
      />
    </View>
  );
}
