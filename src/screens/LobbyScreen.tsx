// Lobby: set up a match against bots, or create / join an online room and wait for players.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { BotDifficulty, GameMap, Role } from '../types';
import { Screen, ScreenHeader, Card, Chip, H, P, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { MapPreview } from '../components/MapPreview';
import { useGame, useProfile } from '../state/GameContext';
import { findSkin } from '../data/skins';
import { outfitEmoji } from '../data/catalog';
import { ABILITIES } from '../engine/abilities';
import { assignRoles, knockoutRoles } from '../engine/GameEngine';
import { CLASSIC_DURATION_SEC, KNOCKOUT_SIZE, TOURNAMENT_ROUND_SEC } from '../engine/constants';
import { isFirebaseConfigured } from '../services/firebase';
import { MAX_ROOM_PLAYERS, knockedOut, roomCapacity, roomService } from '../services/roomService';
import type { Room } from '../services/roomService';
import { getTournamentById, roundName, tournamentStatus } from '../logic/tournaments';
import { localSetup, makeBots, onlineSetup, roomMap, seededRng } from '../utils/matchSetup';
import { colors, radius } from '../theme';
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
  const { flow, map } = route.params;
  const profile = useProfile();
  const { toast } = useGame();
  const onlineCapable = isFirebaseConfigured && (flow.mode === 'classic' || flow.mode === 'tournament');

  const [tab, setTab] = useState<Tab>(route.params.roomCode ? 'online' : 'bots');
  const [botCount, setBotCount] = useState(flow.mode === 'training' ? 4 : 7);
  const [difficulty, setDifficulty] = useState<BotDifficulty>(flow.mode === 'training' ? 'easy' : 'normal');
  const [trainingRole, setTrainingRole] = useState<Role>('survivor');
  const [trainingMinutes, setTrainingMinutes] = useState(5);

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
      durationSec: flow.mode === 'training' ? trainingMinutes * 60 : undefined,
    });
    navigation.replace('Game', { setup });
  };

  const skin = findSkin(profile.selectedSkinId, profile.customSkins);

  return (
    <Screen scroll>
      <ScreenHeader title={MODE_TITLE[flow.mode]} />

      <Card style={styles.summary}>
        <MapPreview map={map} width={130} />
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

      {onlineCapable ? (
        <Tabs<Tab>
          tabs={[
            { id: 'bots', label: '🤖 Vs bots' },
            { id: 'online', label: '🌐 Online' },
          ]}
          value={tab}
          onChange={setTab}
        />
      ) : null}

      {tab === 'online' && onlineCapable ? (
        <OnlineLobby flow={flow} map={map} initialCode={route.params.roomCode} navigation={navigation} />
      ) : flow.mode === 'obstacle' ? (
        <Card style={{ marginTop: 12 }}>
          <H size={16}>🏃 Race the clock</H>
          <P dim style={{ marginTop: 4 }}>
            Reach the finish line 🏁. Traps and saws send you back to the last checkpoint 🚩. Faster time = better medal.
          </P>
          {map.medalTimes ? (
            <P style={{ marginTop: 6 }}>
              🥇 {map.medalTimes[0]}s · 🥈 {map.medalTimes[1]}s · 🥉 {map.medalTimes[2]}s
            </P>
          ) : null}
          <Button title="Start run" icon="🏁" onPress={startLocal} style={{ marginTop: 14 }} />
        </Card>
      ) : (
        <Card style={{ marginTop: 12 }}>
          {flow.mode === 'training' ? (
            <>
              <Label>Practice as</Label>
              <View style={styles.chips}>
                <Chip label="🧍 Survivor" active={trainingRole === 'survivor'} onPress={() => setTrainingRole('survivor')} color={colors.survivor} />
                <Chip label="🧟 Zombie" active={trainingRole === 'zombie'} onPress={() => setTrainingRole('zombie')} />
              </View>
              <Label>Duration</Label>
              <View style={styles.chips}>
                {[2, 5, 10].map((m) => (
                  <Chip key={m} label={`${m} min`} active={trainingMinutes === m} onPress={() => setTrainingMinutes(m)} color={colors.gold} />
                ))}
              </View>
            </>
          ) : null}
          {flow.mode === 'tournament' ? (
            <>
              <H size={16}>🏆 Knockout tournament</H>
              <P dim style={{ marginTop: 4 }}>
                {KNOCKOUT_SIZE} players, half zombies and half survivors. You advance only if the team you started on wins (even if you got infected along the way).
                Quarter-final → Semi-final → a 2-player Final. The champion wins the big prize!
              </P>
              <P dim style={{ marginTop: 4 }}>
                ⏱️ {TOURNAMENT_ROUND_SEC / 60} min per round · 🏃 faster survivors · 🐢 slower zombies
              </P>
            </>
          ) : (
            <>
              <Label>Bots: {botCount}</Label>
              <Stepper value={botCount} min={1} max={MAX_ROOM_PLAYERS - 1} onChange={setBotCount} />
            </>
          )}
          <Label>Difficulty</Label>
          <View style={styles.chips}>
            {DIFFICULTIES.filter((d) => flow.mode === 'training' || d.id !== 'dummy').map((d) => (
              <Chip key={d.id} label={d.label} active={difficulty === d.id} onPress={() => setDifficulty(d.id)} color={d.id === 'hard' ? colors.blood : colors.toxic} />
            ))}
          </View>
          {flow.mode === 'training' ? (
            <P dim style={{ marginTop: 8 }}>
              {difficulty === 'dummy' ? 'Dummies: bots stand still and never move. Good for target practice.' : 'In training, abilities recharge 2x faster.'}
            </P>
          ) : null}
          {flow.mode === 'classic' ? (
            <P dim style={{ marginTop: 8 }}>
              Survivors: do tasks and survive 10 minutes. Zombies: infect everyone. Zombies are released after 5 seconds.
            </P>
          ) : null}
          <Button title="Start match" icon="▶️" onPress={startLocal} style={{ marginTop: 14 }} disabled={tournamentClosed} />
        </Card>
      )}
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
              <Text style={{ fontSize: 18 }}>🔄</Text>
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
                <Text style={styles.openCode}>{r.code}{r.mode === 'tournament' ? ' · 🏆' : ''}</Text>
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
    const roles = knockout ? knockoutRoles(ids, rng) : assignRoles(ids, rng);
    try {
      await roomService.start(room.code, { startedAt: 0, seed, roles, bots: botMap, durationSec: knockout ? TOURNAMENT_ROUND_SEC : CLASSIC_DURATION_SEC });
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
            🏆 {roundName(inRun.length + bots)} · {TOURNAMENT_ROUND_SEC / 60} min · half zombies, half survivors
          </P>
        ) : null}
      </Card>
      {out ? (
        <Card highlight={colors.blood}>
          <H size={16}>💀 You are out of the tournament</H>
          <P dim>Your team lost the last round. You already got your prize. You can leave the room or wait for the tournament to end.</P>
        </Card>
      ) : null}

      <Card>
        <H size={16}>Players</H>
        {players.map(([id, p]) => (
          <View key={id} style={[styles.player, alive && !alive.includes(id) && { opacity: 0.4 }]}>
            <Text style={[styles.ready, { color: id === room.hostId ? colors.gold : p.ready ? colors.toxic : colors.textMuted }]}>
              {alive && !alive.includes(id) ? '💀 Out' : id === room.hostId ? '👑 Host' : p.ready ? '✔ Ready' : '… Waiting'}
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
            <Text style={[styles.ready, { color: colors.textMuted }]}>🤖</Text>
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
          <Button title={allReady ? 'Start match' : 'Waiting for everyone to be ready'} icon="▶️" onPress={start} disabled={!allReady} style={{ marginTop: 14 }} />
        </Card>
      ) : (
        <Button
          title={me?.ready ? 'Not ready' : 'I am ready!'}
          icon={me?.ready ? '✋' : '✅'}
          variant={me?.ready ? 'dark' : 'primary'}
          onPress={() => roomService.setReady(room.code, profile.uid, !me?.ready)}
        />
      )}
      <Button title="Leave room" icon="🚪" variant="danger" small onPress={leave} />
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
  summary: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  label: { color: colors.textDim, fontWeight: '800', fontSize: 13, textAlign: 'left', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { flex: 1, backgroundColor: '#0a0f09', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 18, textAlign: 'center', letterSpacing: 4 },
  roomCode: { color: colors.toxic, fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ready: { width: 80, fontWeight: '800', fontSize: 12 },
  playerName: { flex: 1, color: colors.text, fontWeight: '800', textAlign: 'left' },
  openRoom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  openCount: { color: colors.toxic, fontWeight: '900', width: 48 },
  openName: { color: colors.text, fontWeight: '800', textAlign: 'left' },
  openCode: { color: colors.textDim, fontSize: 12, textAlign: 'left', letterSpacing: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.panelLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  stepText: { color: colors.text, fontSize: 22, fontWeight: '900' },
  stepTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  stepDot: { flex: 1, height: 12, borderRadius: 6, backgroundColor: '#0a0f09', borderWidth: 1, borderColor: colors.border },
});
