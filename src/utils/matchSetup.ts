// Builds the MatchSetup handed to the Game screen, for local (bots) and online (room) matches.
import type { BotDifficulty, GameMap, GameMode, MatchRules, Profile, Role } from '../types';
import type { RosterEntry } from '../engine/entities';
import { assignRoles, knockoutRoles } from '../engine/GameEngine';
import { KNOCKOUT_SIZE, TOURNAMENT_ROUND_SEC } from '../engine/constants';
import { BOT_NAMES } from '../engine/bots';
import { BUILT_IN_SKINS, findSkin } from '../data/skins';
import { findBuiltInMap } from '../data/maps';
import { outfitEmoji } from '../data/catalog';
import type { MatchSetup, PlayFlow } from '../navigation/types';
import type { Room, RoomBot } from '../services/roomService';

/** Milliseconds of the role reveal right before the match starts. */
export const COUNTDOWN_MS = 3500;
/** Milliseconds of the "how it started" story shown before the role reveal. */
export const ORIGIN_MS = 5500;

/** Time between pressing "start" and the match starting: origin story, then role reveal. */
export function countdownMs(mode: GameMode): number {
  return mode === 'obstacle' ? COUNTDOWN_MS : ORIGIN_MS + COUNTDOWN_MS;
}

export function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random bots with distinct names and non-exclusive skins. */
export function makeBots(count: number, rng: () => number, takenNames: string[] = []): Record<string, RoomBot> {
  const names = BOT_NAMES.filter((n) => !takenNames.includes(n)).sort(() => rng() - 0.5);
  const skins = BUILT_IN_SKINS.filter((s) => s.rarity !== 'exclusive');
  const out: Record<string, RoomBot> = {};
  for (let i = 0; i < count; i++) {
    out[`bot-${i}`] = { name: names[i % names.length] ?? `Bot ${i + 1}`, skin: skins[Math.floor(rng() * skins.length)] };
  }
  return out;
}

function profileEntry(p: Profile, role: Role): RosterEntry {
  return {
    id: p.uid,
    name: p.displayName,
    isBot: false,
    role,
    skin: findSkin(p.selectedSkinId, p.customSkins),
    outfit: outfitEmoji(p.equippedOutfit),
    loadout: p.loadout,
    upgrades: p.upgrades,
    filter: p.equippedFilter,
  };
}

export interface LocalOptions {
  botCount: number;
  difficulty: BotDifficulty;
  /** Training only: the role the player wants to practise. */
  trainingRole?: Role;
  durationSec?: number;
  /** House rules (classic and training only). */
  rules?: MatchRules;
}

/** A match against bots on this device (also used for training and obstacle runs). */
export function localSetup(profile: Profile, flow: PlayFlow, map: GameMap, opts: LocalOptions): MatchSetup {
  const seed = Math.floor(Math.random() * 1e9);
  const rng = seededRng(seed);
  if (flow.mode === 'obstacle') {
    return {
      flow,
      map,
      roster: [profileEntry(profile, 'survivor')],
      localId: profile.uid,
      isAuthority: true,
      startTime: Date.now() + countdownMs(flow.mode),
      difficulty: opts.difficulty,
      seed,
    };
  }
  const knockout = flow.mode === 'tournament';
  const rules = knockout ? undefined : opts.rules;
  const bots = makeBots(knockout ? KNOCKOUT_SIZE - 1 : opts.botCount, rng);
  const botIds = Object.keys(bots);
  let roles: Record<string, Role>;
  if (knockout) {
    roles = knockoutRoles([profile.uid, ...botIds], rng);
  } else if (flow.mode === 'training' && opts.trainingRole === 'survivor') {
    roles = { ...assignRoles(botIds, rng, undefined, rules?.zombies), [profile.uid]: 'survivor' };
  } else if (flow.mode === 'training' && opts.trainingRole === 'zombie') {
    roles = { ...Object.fromEntries(botIds.map((id) => [id, 'survivor' as Role])), [profile.uid]: 'zombie' };
  } else {
    roles = assignRoles([profile.uid, ...botIds], rng, undefined, rules?.zombies);
  }
  const roster: RosterEntry[] = [
    profileEntry(profile, roles[profile.uid]),
    ...botIds.map((id) => ({ id, name: bots[id].name, isBot: true, role: roles[id], skin: bots[id].skin })),
  ];
  return {
    flow,
    map,
    roster,
    localId: profile.uid,
    isAuthority: true,
    startTime: Date.now() + countdownMs(flow.mode),
    durationSec: knockout ? TOURNAMENT_ROUND_SEC : opts.durationSec,
    difficulty: opts.difficulty,
    seed,
    rules,
  };
}

/**
 * Next knockout round against bots: only players whose starting team won move on,
 * and they are split half zombies, half survivors again. Null when the run is over.
 */
export function nextKnockoutSetup(prev: MatchSetup, winner: Role): MatchSetup | null {
  const alive = prev.roster.filter((r) => r.role === winner);
  if (alive.length < 2 || !alive.some((r) => r.id === prev.localId)) return null;
  const seed = Math.floor(Math.random() * 1e9);
  const roles = knockoutRoles(alive.map((r) => r.id), seededRng(seed));
  return {
    ...prev,
    roster: alive.map((r) => ({ ...r, role: roles[r.id] })),
    startTime: Date.now() + countdownMs(prev.flow.mode),
    durationSec: TOURNAMENT_ROUND_SEC,
    seed,
  };
}

/** The map a room plays on: built-in maps are referenced by id, custom maps are embedded. */
export function roomMap(room: Room): GameMap | undefined {
  return room.map ?? findBuiltInMap(room.mapId);
}

/** Same setup on every client in the room; only the host runs the bots. */
export function onlineSetup(room: Room, uid: string): MatchSetup | null {
  const match = room.match;
  const map = roomMap(room);
  if (!match || !map || typeof match.startedAt !== 'number') return null;
  const players = room.players ?? {};
  const bots = match.bots ?? {};
  const roster: RosterEntry[] = [
    ...Object.entries(players)
      .filter(([id]) => match.roles[id])
      .map(([id, p]) => ({
        id,
        name: p.name,
        isBot: false,
        role: match.roles[id],
        skin: p.skin,
        outfit: outfitEmoji(p.outfit),
        // Realtime Database drops empty arrays, so fall back to the default loadout.
        loadout: p.loadout?.survivor && p.loadout?.zombie ? p.loadout : undefined,
        upgrades: p.upgrades,
        filter: p.filter ?? null,
      })),
    ...Object.entries(bots).map(([id, b]) => ({ id, name: b.name, isBot: true, role: match.roles[id] ?? 'survivor', skin: b.skin })),
  ];
  if (!roster.some((r) => r.id === uid)) return null;
  return {
    flow: { mode: room.mode, tournamentId: room.tournamentId ?? undefined },
    map,
    roster,
    localId: uid,
    isAuthority: room.hostId === uid,
    startTime: match.startedAt + countdownMs(room.mode),
    durationSec: match.durationSec,
    difficulty: room.difficulty,
    seed: match.seed,
    roomCode: room.code,
    rules: match.rules ?? undefined,
  };
}
