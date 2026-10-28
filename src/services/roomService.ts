// Multiplayer lobbies in Realtime Database: rooms/{code}.
import { get, onValue, ref, remove, runTransaction, serverTimestamp, set, update } from 'firebase/database';
import type { AbilityId, BotDifficulty, GameMap, Profile, Role, Skin, UpgradeId } from '../types';
import { findSkin } from '../data/skins';
import { KNOCKOUT_SIZE } from '../engine/constants';
import { realtimeDb } from './firebase';

export interface RoomPlayer {
  name: string;
  skin: Skin;
  outfit: string | null;
  loadout: { survivor: AbilityId[]; zombie: AbilityId[] };
  upgrades: Record<UpgradeId, number>;
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
  } | null;
  /** Knockout tournament in progress: who is still in, and the bots that are still in. */
  knockout?: RoomKnockout | null;
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
    ready: false,
    joinedAt: Date.now(),
  };
}

function code(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const roomService = {
  async create(profile: Profile, opts: { map: GameMap; botCount: number; difficulty: BotDifficulty; mode: Room['mode']; tournamentId?: string }): Promise<string> {
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
          createdAt: serverTimestamp(),
          players: { [profile.uid]: roomPlayerFrom(profile) },
        };
      });
      if (res.committed) return c;
    }
    throw new Error('לא הצלחנו ליצור חדר, נסה שוב');
  },

  async join(roomCode: string, profile: Profile): Promise<void> {
    const c = roomCode.trim().toUpperCase();
    const snap = await get(ref(realtimeDb(), `rooms/${c}`));
    if (!snap.exists()) throw new Error('החדר לא נמצא');
    const room = snap.val() as Room;
    if (room.status !== 'lobby') throw new Error('המשחק בחדר הזה כבר התחיל');
    if (room.knockout?.alive?.length && !room.players?.[profile.uid]) throw new Error('הטורניר בחדר הזה כבר באמצע');
    if (Object.keys(room.players ?? {}).length >= roomCapacity(room) && !room.players?.[profile.uid]) throw new Error('החדר מלא');
    await set(ref(realtimeDb(), `rooms/${c}/players/${profile.uid}`), roomPlayerFrom(profile));
  },

  subscribe(roomCode: string, cb: (room: Room | null) => void): () => void {
    return onValue(ref(realtimeDb(), `rooms/${roomCode}`), (snap) => cb(snap.exists() ? (snap.val() as Room) : null));
  },

  async setReady(roomCode: string, uid: string, ready: boolean) {
    await update(ref(realtimeDb(), `rooms/${roomCode}/players/${uid}`), { ready });
  },

  async updateSettings(roomCode: string, patch: Partial<Pick<Room, 'botCount' | 'difficulty' | 'mapId' | 'map'>>) {
    await update(ref(realtimeDb(), `rooms/${roomCode}`), patch);
  },

  async start(roomCode: string, match: NonNullable<Room['match']>) {
    await update(ref(realtimeDb(), `rooms/${roomCode}`), { match: { ...match, startedAt: serverTimestamp() }, status: 'playing', live: null, buffs: null, result: null });
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

  async listOpen(): Promise<Room[]> {
    const snap = await get(ref(realtimeDb(), 'rooms'));
    if (!snap.exists()) return [];
    const rooms = Object.values(snap.val() as Record<string, Room>);
    return rooms
      .filter((r) => r.status === 'lobby' && !r.knockout?.alive?.length && Object.keys(r.players ?? {}).length < roomCapacity(r))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 20);
  },
};
