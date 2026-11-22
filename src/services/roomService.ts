// Multiplayer lobbies in Realtime Database: rooms/{code}.
import { get, onValue, ref, remove, runTransaction, serverTimestamp, set, update } from 'firebase/database';
import type { AbilityId, BotDifficulty, GameMap, MatchRules, Profile, Role, Skin, UpgradeId } from '../types';
import { findSkin } from '../data/skins';
import { KNOCKOUT_SIZE } from '../engine/constants';
import { realtimeDb } from './firebase';

export interface RoomPlayer {
  name: string;
  skin: Skin;
  outfit: string | null;
  loadout: { survivor: AbilityId[]; zombie: AbilityId[] };
  upgrades: Record<UpgradeId, number>;
  /** Equipped zombie filter, so every client applies the same perk. */
  filter?: string | null;
  ready: boolean;
  joinedAt: number;
}

export interface RoomBot {
  name: string;
  skin: Skin;
}

export interface Room {
  code: string;
  hostId: string;
  mode: 'classic' | 'tournament';
  tournamentId?: string | null;
  mapId: string;
  map?: GameMap | null;
  botCount: number;
  difficulty: BotDifficulty;
  status: 'lobby' | 'playing' | 'ended';
  createdAt: number;
  players: Record<string, RoomPlayer>;
  match?: {
    startedAt: number;
    seed: number;
    roles: Record<string, Role>;
    bots: Record<string, RoomBot>;
    durationSec: number;
    rules?: MatchRules | null;
  } | null;
  /** House rules the host picked (classic rooms). */
  rules?: MatchRules | null;
  /** Match length the host picked, in seconds. */
  durationSec?: number | null;
  /** Knockout tournament in progress: who is still in, and the bots that are still in. */
  knockout?: RoomKnockout | null;
  /** An open room made automatically: no bots, and the match starts by itself once the room is full. */
  public?: boolean | null;
}

/** Open rooms older than this are treated as abandoned. */
const PUBLIC_ROOM_MAX_AGE_MS = 20 * 60 * 1000;

/** True for an open room that can still take players and has not been left behind. */
export function isJoinableOpenRoom(r: Room, now: number): boolean {
  const created = typeof r.createdAt === 'number' ? r.createdAt : now;
  return !!r.public && r.status === 'lobby' && now - created < PUBLIC_ROOM_MAX_AGE_MS && Object.keys(r.players ?? {}).length < roomCapacity(r);
}

export interface RoomKnockout {
  alive: string[];
  bots?: Record<string, RoomBot>;
}

/** Most players a room can hold (a knockout tournament always starts with 8). */
export function roomCapacity(room: Pick<Room, 'mode'>): number {
  return room.mode === 'tournament' ? KNOCKOUT_SIZE : MAX_ROOM_PLAYERS;
}

/** True when the knockout already started and `uid` was knocked out. */
export function knockedOut(room: Room, uid: string): boolean {
  return !!room.knockout?.alive?.length && !room.knockout.alive.includes(uid);
}

export const MAX_ROOM_PLAYERS = 10;

function roomPlayerFrom(p: Profile): RoomPlayer {
  const skin = findSkin(p.selectedSkinId, p.customSkins);
  return {
    name: p.displayName,
    skin,
    outfit: p.equippedOutfit,
    loadout: p.loadout,
    upgrades: p.upgrades,
    filter: p.equippedFilter ?? null,
    ready: false,
    joinedAt: Date.now(),
  };
}

function code(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const roomService = {
  async create(profile: Profile, opts: { map: GameMap; botCount: number; difficulty: BotDifficulty; mode: Room['mode']; tournamentId?: string; public?: boolean }): Promise<string> {
    const db = realtimeDb();
    for (let attempt = 0; attempt < 6; attempt++) {
      const c = code();
      const r = ref(db, `rooms/${c}`);
      const res = await runTransaction(r, (cur) => {
        if (cur) return undefined; // taken: abort
        return {
          code: c,
          hostId: profile.uid,
          mode: opts.mode,
          tournamentId: opts.tournamentId ?? null,
          mapId: opts.map.id,
          map: opts.map.builtIn ? null : opts.map,
          botCount: opts.botCount,
          difficulty: opts.difficulty,
          status: 'lobby',
          public: opts.public ?? null,
          createdAt: serverTimestamp(),
          players: { [profile.uid]: roomPlayerFrom(profile) },
        };
      });
      if (res.committed) return c;
    }
    throw new Error('Could not create a room, try again');
  },

  async join(roomCode: string, profile: Profile): Promise<void> {
    const c = roomCode.trim().toUpperCase();
    const snap = await get(ref(realtimeDb(), `rooms/${c}`));
    if (!snap.exists()) throw new Error('Room not found');
    const room = snap.val() as Room;
    if (room.status !== 'lobby') throw new Error('The match in this room has already started');
    if (room.knockout?.alive?.length && !room.players?.[profile.uid]) throw new Error('The tournament in this room is already underway');
    if (Object.keys(room.players ?? {}).length >= roomCapacity(room) && !room.players?.[profile.uid]) throw new Error('The room is full');
    await set(ref(realtimeDb(), `rooms/${c}/players/${profile.uid}`), roomPlayerFrom(profile));
  },

  subscribe(roomCode: string, cb: (room: Room | null) => void): () => void {
    return onValue(ref(realtimeDb(), `rooms/${roomCode}`), (snap) => cb(snap.exists() ? (snap.val() as Room) : null));
  },

  async setReady(roomCode: string, uid: string, ready: boolean) {
    await update(ref(realtimeDb(), `rooms/${roomCode}/players/${uid}`), { ready });
  },

  async updateSettings(roomCode: string, patch: Partial<Pick<Room, 'botCount' | 'difficulty' | 'mapId' | 'map' | 'rules' | 'durationSec'>>) {
    await update(ref(realtimeDb(), `rooms/${roomCode}`), patch);
  },

  async start(roomCode: string, match: NonNullable<Room['match']>) {
    await update(ref(realtimeDb(), `rooms/${roomCode}`), { match: { ...match, startedAt: serverTimestamp() }, status: 'playing', public: null, live: null, buffs: null, result: null });
  },

  /** Host only: who moves on to the next knockout round (null when the run is over). */
  async setKnockout(roomCode: string, knockout: RoomKnockout | null, newHostId?: string) {
    const patch: Record<string, unknown> = { knockout };
    if (newHostId) patch.hostId = newHostId;
    await update(ref(realtimeDb(), `rooms/${roomCode}`), patch);
  },

  async backToLobby(roomCode: string) {
    await update(ref(realtimeDb(), `rooms/${roomCode}`), { status: 'lobby', match: null, live: null, buffs: null, result: null });
  },

  async leave(roomCode: string, uid: string) {
    const db = realtimeDb();
    const snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    const room = snap.val() as Room;
    const others = Object.keys(room.players ?? {}).filter((id) => id !== uid);
    if (others.length === 0) {
      await remove(ref(db, `rooms/${roomCode}`));
      return;
    }
    const patch: Record<string, unknown> = { [`players/${uid}`]: null, [`live/${uid}`]: null };
    // Hand the room to the next player, preferring one still in the knockout.
    if (room.hostId === uid) patch.hostId = others.find((id) => room.knockout?.alive?.includes(id)) ?? others[0];
    await update(ref(db, `rooms/${roomCode}`), patch);
  },

  /** Every room still waiting for players (private ones too), newest first. */
  async listOpen(): Promise<Room[]> {
    const snap = await get(ref(realtimeDb(), 'rooms'));
    if (!snap.exists()) return [];
    const rooms = Object.values(snap.val() as Record<string, Room>);
    return rooms
      .filter((r) => r.status === 'lobby' && !r.knockout?.alive?.length && Object.keys(r.players ?? {}).length < roomCapacity(r))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 60);
  },

  /**
   * Join the fullest open room of this kind, or make a new one when there is none.
   * Returns the room code. The match starts by itself when the room fills up.
   */
  async quickJoin(profile: Profile, opts: { map: GameMap; mode: Room['mode']; tournamentId?: string }): Promise<string> {
    const now = Date.now();
    const rooms = (await this.listOpen())
      .filter((r) => isJoinableOpenRoom(r, now) && r.mode === opts.mode && (r.tournamentId ?? null) === (opts.tournamentId ?? null))
      .sort((a, b) => Object.keys(b.players ?? {}).length - Object.keys(a.players ?? {}).length);
    for (const r of rooms) {
      try {
        await this.join(r.code, profile);
        return r.code;
      } catch {
        // It filled up or started meanwhile: try the next one.
      }
    }
    return this.create(profile, { map: opts.map, botCount: 0, difficulty: 'normal', mode: opts.mode, tournamentId: opts.tournamentId, public: true });
  },
};
