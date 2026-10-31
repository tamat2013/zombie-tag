// Lobby: set up a match against bots, or create / join an online room and wait for players.
import { useDevice } from '../utils/device';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Pressable, TextInput, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { BotDifficulty, GameMap, MatchRules, Role } from '../types';
import { Screen, ScreenHeader, Card, Grid, H, P, Tabs } from '../components/ui';
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
import { Glyph, Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { colors, outline, radius } from '../theme';
import { haptic } from '../utils/haptics';

type Tab = 'bots' | 'online';
type OnlineTab = 'create' | 'join' | 'rooms';
type RoomTab = 'players' | 'settings';
type Opt = { key: string; label: string; active: boolean; onPress: () => void; color?: string };
/** One setting: its title and current value, and the options to pick from. */
type Tile = { icon: IconName; title: string; color: string; value?: string; opts: Opt[] };

const DIFFICULTIES: { id: BotDifficulty; label: string }[] = [
  { id: 'dummy', label: 'Dummies' },
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Hard' },
];

const MODE_TITLE = { classic: 'Lobby · Classic', tournament: 'Lobby · Tournament', obstacle: 'Obstacle Course', training: 'Training' } as const;

const ZOMBIE_COUNTS = [0, 1, 2, 3];
const RELEASE_DELAYS = [3, 5, 10, 20];
const ZOMBIE_SPEEDS: { v: number; label: string }[] = [
  { v: 0.85, label: 'Slow' },
  { v: 1, label: 'Normal' },
  { v: 1.15, label: 'Fast' },
];
const DOCTOR_COUNTS = [0, 1, 2, 3];
const CLASSIC_MINUTES = [3, 5, 10, 15];
const BOT_COUNTS = Array.from({ length: MAX_ROOM_PLAYERS }, (_, i) => i);

/** The widest preview of a map that still fits a box of maxWidth × maxHeight, keeping the map's shape. */
function fitWidth(map: GameMap, maxWidth: number, maxHeight: number): number {
  return Math.max(40, Math.min(maxWidth, (maxHeight * map.width) / map.height));
}

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

  // The map and who is playing, shown beside every lobby.
  const summary = (
    <Card style={styles.summary}>
      <MapPreview map={map} width={fitWidth(map, isDesktop ? 288 : 200, isDesktop ? 200 : 84)} />
      <H size={isDesktop ? 17 : 15}>{map.name}</H>
      {tournament ? (
        <View style={styles.tourRow}>
          <Glyph emoji={tournament.icon} size={14} color={colors.gold} />
          <P dim style={styles.small}>{tournament.name}</P>
        </View>
      ) : null}
      <View style={styles.who}>
        <Character skin={skin} size={isDesktop ? 38 : 30} outfit={outfitEmoji(profile.equippedOutfit)} />
        <Text style={styles.name} numberOfLines={1}>
          {profile.displayName}
        </Text>
      </View>
      <View style={styles.abilities}>
        {profile.loadout.survivor.map((a) => (
          <Glyph key={`s${a}`} emoji={ABILITIES[a].icon} size={16} color={colors.survivor} />
        ))}
        <View style={styles.divider} />
        {profile.loadout.zombie.map((a) => (
          <Glyph key={`z${a}`} emoji={ABILITIES[a].icon} size={16} color={colors.zombie} />
        ))}
      </View>
    </Card>
  );

  const mainTabs = onlineCapable ? (
    <Tabs<Tab>
      tabs={[
        { id: 'bots', label: 'Vs bots' },
        { id: 'online', label: 'Online' },
      ]}
      value={tab}
      onChange={setTab}
    />
  ) : null;

  const right =
    flow.mode === 'obstacle' ? (
      <View style={styles.panel}>
        <Card>
          <H size={isDesktop ? 18 : 15}>Race the clock</H>
          <P dim style={styles.note}>
            Reach the finish line. Traps and saws send you back to the last checkpoint. Faster time = better medal.
          </P>
          {map.medalTimes ? (
            <P style={styles.medal}>
              Gold {map.medalTimes[0]}s · Silver {map.medalTimes[1]}s · Bronze {map.medalTimes[2]}s
            </P>
          ) : null}
        </Card>
        <View style={styles.grow} />
        <Button title="Start run" icon="🏁" onPress={startLocal} small={!isDesktop} />
      </View>
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
    );

  return (
    <Screen scroll>
      <ScreenHeader title={MODE_TITLE[flow.mode]} />
      {tab === 'online' && onlineCapable ? (
        <OnlineLobby flow={flow} map={map} initialCode={route.params.roomCode} navigation={navigation} summary={summary} mainTabs={mainTabs} />
      ) : (
        <Split left={<>{mainTabs}{summary}</>} right={right} />
      )}
    </Screen>
  );
}

/** Two columns side by side. On a tall phone the right column moves under the left one. */
function Split({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const { isDesktop, width, height } = useDevice();
  const stacked = !isDesktop && height > width;
  return (
    <View style={[styles.split, isDesktop ? styles.splitDesk : stacked && styles.splitStacked]}>
      <View style={[styles.left, isDesktop ? styles.leftDesk : !stacked && styles.leftPhone]}>{left}</View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

// ---- Setting tiles --------------------------------------------------------------------------

/** One option per value; the chosen one is highlighted. */
function choices<N extends number>(values: N[], current: N, onPick: (n: N) => void, label: (n: N) => string = (n) => String(n)): Opt[] {
  return values.map((n) => ({ key: String(n), label: label(n), active: n === current, onPress: () => onPick(n) }));
}

const countLabel = (n: number, zero: string) => (n === 0 ? zero : String(n));

function practiceTile(role: Role, onPick: (r: Role) => void): Tile {
  return {
    icon: 'account-switch-outline',
    title: 'Practice as',
    color: colors.survivor,
    opts: [
      { key: 's', label: 'Survivor', active: role === 'survivor', onPress: () => onPick('survivor'), color: colors.survivor },
      { key: 'z', label: 'Zombie', active: role === 'zombie', onPress: () => onPick('zombie'), color: colors.zombie },
    ],
  };
}

function botsTile(count: number, values: number[], onPick: (n: number) => void): Tile {
  return { icon: 'robot-outline', title: 'Bots', color: colors.blue, value: String(count), opts: choices(values, count, onPick) };
}

function minutesTile(title: string, values: number[], minutes: number, onPick: (m: number) => void): Tile {
  return { icon: 'timer-outline', title, color: colors.gold, value: `${minutes} min`, opts: choices(values, minutes, onPick) };
}

function difficultyTile(title: string, value: string, onPick: (d: BotDifficulty) => void, dummies: boolean): Tile {
  return {
    icon: 'speedometer',
    title,
    color: colors.toxic,
    opts: DIFFICULTIES.filter((d) => dummies || d.id !== 'dummy').map((d) => ({
      key: d.id,
      label: d.label,
      active: value === d.id,
      onPress: () => onPick(d.id),
      color: d.id === 'hard' ? colors.blood : colors.toxic,
    })),
  };
}

function ruleTiles(r: MatchRules, onRules: (patch: Partial<MatchRules>) => void, withAbility: boolean): Tile[] {
  const tiles: Tile[] = [
    {
      icon: 'virus-outline',
      title: 'Starting zombies',
      color: colors.zombie,
      value: countLabel(r.zombies, 'Auto'),
      opts: choices(ZOMBIE_COUNTS, r.zombies, (n) => onRules({ zombies: n }), (n) => countLabel(n, 'Auto')),
    },
    {
      icon: 'lock-open-outline',
      title: 'Zombies released after',
      color: colors.blue,
      value: `${r.releaseDelaySec}s`,
      opts: choices(RELEASE_DELAYS, r.releaseDelaySec, (n) => onRules({ releaseDelaySec: n }), (n) => `${n}s`),
    },
    {
      icon: 'run-fast',
      title: 'Zombie speed',
      color: colors.blood,
      opts: ZOMBIE_SPEEDS.map((z) => ({ key: String(z.v), label: z.label, active: r.zombieSpeed === z.v, onPress: () => onRules({ zombieSpeed: z.v }), color: z.v > 1 ? colors.blood : colors.toxic })),
    },
    {
      icon: 'medical-bag',
      title: 'Doctors',
      color: colors.blue,
      value: countLabel(r.doctors, 'None'),
      opts: choices(DOCTOR_COUNTS, r.doctors, (n) => onRules({ doctors: n }), (n) => countLabel(n, 'None')),
    },
  ];
  if (withAbility) {
    tiles.push({
      icon: 'flash-outline',
      title: 'Ability recharge',
      color: colors.purple,
      opts: [
        { key: 'n', label: 'Normal', active: !r.fastAbilities, onPress: () => onRules({ fastAbilities: false }) },
        { key: 'f', label: '2x faster', active: r.fastAbilities, onPress: () => onRules({ fastAbilities: true }) },
      ],
    });
  }
  return tiles;
}

/** One setting as a tile: icon, title and current value on top, the options as a segmented bar below. */
function SettingTile({ icon, title, color, value, opts, compact = false }: Tile & { compact?: boolean }) {
  return (
    <View style={[styles.tile, compact && styles.tileCompact]}>
      <View style={styles.tileHead}>
        <View style={[styles.tileIcon, compact && styles.tileIconCompact, { backgroundColor: color }]}>
          <Icon name={icon} size={compact ? 14 : 18} color={colors.ink} />
        </View>
        <Text style={[styles.tileTitle, compact && styles.tileTitleCompact]} numberOfLines={1}>
          {title}
        </Text>
        {value ? <Text style={[styles.tileValue, compact && styles.tileValueCompact, { color }]}>{value}</Text> : null}
      </View>
      <View style={[styles.seg, compact && styles.segCompact]}>
        {opts.map((o) => (
          <Pressable key={o.key} onPress={o.onPress} style={[styles.segBtn, compact && styles.segBtnCompact, o.active && { backgroundColor: o.color ?? color }]}>
            <Text style={[styles.segText, compact && styles.segTextCompact, o.active && { color: colors.ink }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** The setting tiles: wrapped on the desktop, paged on the phone so nothing scrolls. */
function TileGrid({ tiles }: { tiles: Tile[] }) {
  const { isDesktop } = useDevice();
  return (
    <Grid
      items={tiles}
      minWidth={isDesktop ? 230 : 190}
      minHeight={isDesktop ? 116 : 68}
      gap={isDesktop ? 12 : 8}
      paged={!isDesktop}
      renderItem={(t) => <SettingTile {...t} compact={!isDesktop} />}
    />
  );
}

/** Match briefing: the local setup as setting tiles, with the start button under them. */
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
  const { isDesktop } = useDevice();
  const training = p.mode === 'training';
  const tournament = p.mode === 'tournament';
  const rulesOn = p.mode === 'classic' || training;
  const tiles: Tile[] = [
    ...(training ? [practiceTile(p.trainingRole, p.onTrainingRole), minutesTile('Duration', [2, 5, 10], p.trainingMinutes, p.onTrainingMinutes)] : []),
    ...(tournament ? [] : [botsTile(p.botCount, BOT_COUNTS.slice(1), p.onBots)]),
    difficultyTile('Difficulty', p.difficulty, p.onDifficulty, training),
    ...(p.mode === 'classic' ? [minutesTile('Match length', CLASSIC_MINUTES, p.classicMinutes, p.onClassicMinutes)] : []),
    ...(rulesOn ? ruleTiles(p.rules, p.onRules, !training) : []),
  ];
  return (
    <View style={styles.panel}>
      {tournament ? (
        <Card>
          <View style={styles.noteHead}>
            <View style={[styles.tileIcon, { backgroundColor: colors.gold }]}>
              <Icon name="trophy-outline" size={18} color={colors.ink} />
            </View>
            <H size={isDesktop ? 16 : 14}>Knockout tournament</H>
          </View>
          <P dim style={!isDesktop && styles.noteText}>
            {KNOCKOUT_SIZE} players, half zombies and half survivors. You advance only if the team you started on wins (even if you got infected along the way). Quarter-final → Semi-final → a 2-player Final. The champion wins the big prize!
          </P>
          <P dim style={!isDesktop && styles.noteText}>
            {TOURNAMENT_ROUND_SEC / 60} min per round · faster survivors · slower zombies
          </P>
        </Card>
      ) : null}
      {training ? (
        <P dim style={!isDesktop && styles.noteText}>
          {p.difficulty === 'dummy' ? 'Dummies: bots stand still and never move. Good for target practice.' : 'In training, abilities recharge 2x faster.'}
        </P>
      ) : null}
      <TileGrid tiles={tiles} />
      <Button title="Start match" icon="▶️" onPress={p.onStart} disabled={p.startDisabled} small={!isDesktop} />
    </View>
  );
}

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

// ---- Online rooms -----------------------------------------------------------------------------

function OnlineLobby({
  flow,
  map,
  initialCode,
  navigation,
  summary,
  mainTabs,
}: {
  flow: ScreenProps<'Lobby'>['route']['params']['flow'];
  map: GameMap;
  initialCode?: string;
  navigation: ScreenProps<'Lobby'>['navigation'];
  summary: React.ReactNode;
  mainTabs: React.ReactNode;
}) {
  const profile = useProfile();
  const { toast } = useGame();
  const { isDesktop } = useDevice();
  const [code, setCode] = useState<string | null>(initialCode ?? null);
  const [room, setRoom] = useState<Room | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [openRooms, setOpenRooms] = useState<Room[] | null>(null);
  const [subTab, setSubTab] = useState<OnlineTab>('create');
  const [roomTab, setRoomTab] = useState<RoomTab>('players');
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

  const lobbyLeft = (
    <>
      {mainTabs}
      {summary}
    </>
  );

  const createCard = (
    <Card>
      <H size={16}>Create a new room</H>
      <P dim>
        Friends join with a 5-letter code. Up to {flow.mode === 'tournament' ? KNOCKOUT_SIZE : MAX_ROOM_PLAYERS} players; bots fill empty spots.
      </P>
      <Button title="Create room" icon="➕" onPress={create} loading={busy} small={!isDesktop} style={styles.cardBtn} />
    </Card>
  );

  const joinCard = (
    <Card>
      <H size={16}>Join with a code</H>
      <View style={styles.joinRow}>
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
  );

  const roomsCard = (
    <Card style={styles.roomsCard}>
      <View style={styles.roomsHead}>
        <H size={16}>Open rooms</H>
        <Pressable onPress={loadOpen} hitSlop={8}>
          <Icon name="refresh" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.roomsBlock}>
        {openRooms === null ? <ActivityIndicator color={colors.toxic} /> : null}
        {openRooms?.length === 0 ? <P dim>No open rooms right now. Create one!</P> : null}
        {openRooms && openRooms.length > 0 ? (
          <Grid
            items={openRooms}
            minWidth={isDesktop ? 220 : 150}
            minHeight={isDesktop ? 64 : 58}
            gap={isDesktop ? 12 : 8}
            paged={!isDesktop}
            renderItem={(r) => (
              <Pressable onPress={() => join(r.code)} style={styles.openRoom}>
                <Text style={styles.openCount}>
                  {Object.keys(r.players ?? {}).length}/{roomCapacity(r)}
                </Text>
                <View style={styles.openInfo}>
                  <Text style={styles.openName} numberOfLines={1}>
                    {r.players?.[r.hostId]?.name ?? 'Room'} · {roomMap(r)?.name ?? r.mapId}
                  </Text>
                  <Text style={styles.openCode} numberOfLines={1}>
                    {r.code}
                    {r.mode === 'tournament' ? ' · Tournament' : ''}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        ) : null}
      </View>
    </Card>
  );

  // Desktop shows all three cards; the phone shows one of them at a time.
  const browse = isDesktop ? (
    <>
      {createCard}
      {joinCard}
      {roomsCard}
    </>
  ) : (
    <>
      <Tabs<OnlineTab>
        tabs={[
          { id: 'create', label: 'Create' },
          { id: 'join', label: 'Join' },
          { id: 'rooms', label: 'Rooms' },
        ]}
        value={subTab}
        onChange={setSubTab}
      />
      <View style={styles.panel}>{subTab === 'create' ? createCard : subTab === 'join' ? joinCard : roomsCard}</View>
    </>
  );

  if (!code) return <Split left={lobbyLeft} right={browse} />;
  if (!room) return <Split left={lobbyLeft} right={<ActivityIndicator color={colors.toxic} style={{ marginTop: 30 }} />} />;

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
  const hasSettings = isHost || !knockout;
  const showSettings = hasSettings && roomTab === 'settings' && !out;
  const avatar = isDesktop ? 40 : 30;

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

  const levelTile = difficultyTile('Bot level', room.difficulty, (d) => roomService.updateSettings(room.code, { difficulty: d }), false);
  const hostTiles: Tile[] = knockout
    ? [levelTile]
    : [
        botsTile(room.botCount, BOT_COUNTS, (n) => roomService.updateSettings(room.code, { botCount: n })),
        levelTile,
        minutesTile('Match length', CLASSIC_MINUTES, roomMinutes, (m) => roomService.updateSettings(room.code, { durationSec: m * 60 }).catch(() => {})),
        ...ruleTiles(roomRules, (patch) => roomService.updateSettings(room.code, { rules: { ...roomRules, ...patch } }).catch(() => {}), true),
      ];

  const rulesCard = (
    <Card>
      <H size={16}>Match rules</H>
      <P dim style={styles.note}>
        {rulesSummary(roomRules, roomMinutes)}
      </P>
    </Card>
  );

  // Players first, then the bots that fill the empty spots.
  const slots = [
    ...players.map(([id, p]) => ({ id, p })),
    ...Array.from({ length: bots }, (_, i) => ({ id: `b${i}`, p: null })),
  ];

  const playersGrid = (
    <Grid
      items={slots}
      minWidth={isDesktop ? 220 : 150}
      minHeight={isDesktop ? 84 : 58}
      gap={isDesktop ? 12 : 8}
      paged={!isDesktop}
      renderItem={(s) => {
        if (!s.p) {
          return (
            <View style={[styles.slot, styles.botSlot]}>
              <View style={{ width: avatar, alignItems: 'center' }}>
                <Icon name="robot-outline" size={avatar * 0.6} color={colors.textMuted} />
              </View>
              <Text style={styles.playerName}>Bot</Text>
            </View>
          );
        }
        const outPlayer = alive ? !alive.includes(s.id) : false;
        const status = outPlayer ? 'Out' : s.id === room.hostId ? 'Host' : s.p.ready ? 'Ready' : '… Waiting';
        const tone = s.id === room.hostId ? colors.gold : s.p.ready ? colors.toxic : colors.textMuted;
        return (
          <View style={[styles.slot, outPlayer && { opacity: 0.4 }]}>
            <Character skin={s.p.skin} size={avatar} outfit={outfitEmoji(s.p.outfit)} />
            <View style={styles.slotInfo}>
              <Text style={styles.playerName} numberOfLines={1}>
                {s.p.name}
                {s.id === profile.uid ? ' (you)' : ''}
              </Text>
              <Text style={[styles.ready, { color: tone }]}>{status}</Text>
            </View>
          </View>
        );
      }}
    />
  );

  const footer = isHost ? (
    <Button title={allReady ? 'Start match' : 'Waiting for everyone to be ready'} icon="▶️" onPress={start} disabled={!allReady} small={!isDesktop} />
  ) : (
    <Button
      title={me?.ready ? 'Not ready' : 'I am ready!'}
      icon={me?.ready ? '✋' : '✅'}
      variant={me?.ready ? 'dark' : 'primary'}
      onPress={() => roomService.setReady(room.code, profile.uid, !me?.ready)}
      small={!isDesktop}
    />
  );

  return (
    <Split
      left={
        <>
          {mainTabs}
          <Card highlight={colors.toxic} style={styles.roomCard}>
            <P dim>Room code</P>
            <Text style={[styles.roomCode, !isDesktop && styles.roomCodePhone]}>{room.code}</Text>
            <P dim>
              {inRun.length} players · {bots} bots · {roomMap(room)?.name}
            </P>
            {knockout ? (
              <P style={styles.roundLine}>
                {roundName(inRun.length + bots)} · {TOURNAMENT_ROUND_SEC / 60} min · half zombies, half survivors
              </P>
            ) : null}
          </Card>
          <View style={styles.grow} />
          <Button title="Leave room" icon="🚪" variant="danger" small onPress={leave} />
        </>
      }
      right={
        <>
          {out ? (
            <Card highlight={colors.blood}>
              <H size={16}>You are out of the tournament</H>
              <P dim>Your team lost the last round. You already got your prize. You can leave the room or wait for the tournament to end.</P>
            </Card>
          ) : null}
          {hasSettings && !out ? (
            <Tabs<RoomTab>
              tabs={[
                { id: 'players', label: 'Players' },
                { id: 'settings', label: 'Settings' },
              ]}
              value={roomTab}
              onChange={setRoomTab}
            />
          ) : null}
          <View style={styles.panel}>{showSettings ? (isHost ? <TileGrid tiles={hostTiles} /> : rulesCard) : playersGrid}</View>
          {out ? null : footer}
        </>
      }
    />
  );
}

// ---- Styles ---------------------------------------------------------------------------------

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row', gap: 14 },
  splitDesk: { gap: 28 },
  splitStacked: { flexDirection: 'column', gap: 10 },
  left: { gap: 10 },
  leftDesk: { width: 320 },
  leftPhone: { width: 232 },
  right: { flex: 1, minWidth: 0, minHeight: 0, gap: 8 },
  panel: { flex: 1, minHeight: 0, gap: 8 },
  grow: { flex: 1 },
  summary: { gap: 6 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  name: { flexShrink: 1, color: colors.text, fontWeight: '800', textAlign: 'left' },
  abilities: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  divider: { width: 2, height: 16, borderRadius: 1, backgroundColor: colors.border },
  small: { fontSize: 12, lineHeight: 16, flexShrink: 1 },
  tourRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { marginTop: 4 },
  medal: { marginTop: 6 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteText: { fontSize: 13, lineHeight: 18 },
  tile: { flex: 1, backgroundColor: colors.panel, borderRadius: radius.lg, padding: 12, gap: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: 'rgba(255,255,255,0.08)' },
  tileCompact: { paddingVertical: 4, paddingHorizontal: 8, gap: 3, borderRadius: radius.md, borderWidth: 1, borderBottomWidth: 3 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileIconCompact: { width: 22, height: 22, borderRadius: 7 },
  tileTitle: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 14, textAlign: 'left' },
  tileTitleCompact: { fontSize: 13 },
  tileValue: { fontWeight: '900', fontSize: 18 },
  tileValueCompact: { fontSize: 13 },
  seg: { flex: 1, flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: 12, padding: 3, gap: 3 },
  segCompact: { padding: 2, borderRadius: 9 },
  segBtn: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 6 },
  segBtnCompact: { minHeight: 24, borderRadius: 7, paddingHorizontal: 2 },
  segText: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  segTextCompact: { fontSize: 12 },
  cardBtn: { marginTop: 10 },
  joinRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.bgAlt, borderRadius: radius.sm, ...outline, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 18, textAlign: 'center', letterSpacing: 4 },
  roomsCard: { flex: 1 },
  roomsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomsBlock: { flex: 1, minHeight: 0, gap: 8, marginTop: 8 },
  openRoom: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.md, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  openCount: { color: colors.toxic, fontWeight: '900', fontSize: 15, minWidth: 40 },
  openInfo: { flex: 1, minWidth: 0 },
  openName: { color: colors.text, fontWeight: '800', textAlign: 'left' },
  openCode: { color: colors.textDim, fontSize: 12, textAlign: 'left', letterSpacing: 2 },
  roomCard: { alignItems: 'center' },
  roomCode: { color: colors.toxic, fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  roomCodePhone: { fontSize: 30, letterSpacing: 6 },
  roundLine: { marginTop: 4, color: colors.gold, fontWeight: '800', textAlign: 'center' },
  slot: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  botSlot: { opacity: 0.55 },
  slotInfo: { flex: 1, minWidth: 0 },
  playerName: { color: colors.text, fontWeight: '800', textAlign: 'left' },
  ready: { fontWeight: '800', fontSize: 12, textAlign: 'left' },
});
