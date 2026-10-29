// Scheduled knockout tournaments. The schedule is computed from the clock so every client agrees on it
// without a server; leaderboard points live in Firestore when online (simulated rivals when offline).
//
// Each run is a knockout: 8 players, half zombies and half survivors. Only players whose STARTING
// team wins move on (8 → 4 → 2). The winner of the final is the champion. Prizes are paid as soon
// as the run ends.
import type { MatchResult, Profile } from '../types.ts';

export interface TournamentPrize {
  coins: number;
  medals: number;
  skin?: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  icon: string;
  startsAt: number;
  endsAt: number;
  /** [champion, final loser, semi-final loser, everyone else]. */
  prizes: TournamentPrize[];
}

const HOUR = 3600_000;

function stamp(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function rush(start: Date): Tournament {
  return {
    id: `rush-${stamp(start)}-${String(start.getHours()).padStart(2, '0')}`,
    name: 'Panic Run',
    description: 'A one-hour blitz knockout. You advance only if your team wins.',
    icon: '⚡',
    startsAt: start.getTime(),
    endsAt: start.getTime() + HOUR,
    prizes: [{ coins: 1200, medals: 8 }, { coins: 500, medals: 3 }, { coins: 250, medals: 1 }, { coins: 60, medals: 0 }],
  };
}

function night(start: Date): Tournament {
  return {
    id: `night-${stamp(start)}`,
    name: 'Night Outbreak',
    description: 'Every evening 20:00–22:00. The champion wins the exclusive "Tournament Champion" skin!',
    icon: '🌙',
    startsAt: start.getTime(),
    endsAt: start.getTime() + 2 * HOUR,
    prizes: [{ coins: 2500, medals: 15, skin: 'champion' }, { coins: 1000, medals: 6 }, { coins: 500, medals: 3 }, { coins: 100, medals: 0 }],
  };
}

function cup(start: Date): Tournament {
  return {
    id: `cup-${stamp(start)}`,
    name: 'Apocalypse Cup',
    description: 'The weekend tournament with the biggest prizes, including the exclusive "Tournament Champion" skin!',
    icon: '🏆',
    startsAt: start.getTime(),
    endsAt: start.getTime() + 28 * HOUR,
    prizes: [{ coins: 6000, medals: 40, skin: 'champion' }, { coins: 2500, medals: 15 }, { coins: 1200, medals: 8 }, { coins: 200, medals: 1 }],
  };
}

/** Tournaments that ended in the last day, are running, or start in the next ~2 days. */
export function getTournaments(now: number): Tournament[] {
  const list: Tournament[] = [];
  const d = new Date(now);
  // Rush: every 3 hours on the hour (00, 03, 06, ...), one hour long.
  const r = new Date(d);
  r.setMinutes(0, 0, 0);
  r.setHours(r.getHours() - (r.getHours() % 3));
  for (let i = -2; i <= 4; i++) list.push(rush(new Date(r.getTime() + i * 3 * HOUR)));
  // Night: 20:00 daily.
  for (let i = -1; i <= 2; i++) {
    const n = new Date(d);
    n.setDate(n.getDate() + i);
    n.setHours(20, 0, 0, 0);
    list.push(night(n));
  }
  // Cup: Friday 18:00 -> Saturday 22:00.
  for (let i = -1; i <= 1; i++) {
    const c = new Date(d);
    c.setHours(18, 0, 0, 0);
    c.setDate(c.getDate() - ((c.getDay() + 2) % 7) + i * 7); // back to Friday
    list.push(cup(c));
  }
  return list
    .filter((t) => t.endsAt > now - 24 * HOUR && t.startsAt < now + 50 * HOUR)
    .sort((a, b) => a.startsAt - b.startsAt);
}

export function getTournamentById(id: string, now: number): Tournament | undefined {
  // Look a week around `now` so recently-ended tournaments can still be claimed.
  for (let off = -7; off <= 2; off++) {
    const found = getTournaments(now + off * 24 * HOUR).find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

export function tournamentStatus(t: Tournament, now: number): 'upcoming' | 'live' | 'ended' {
  if (now < t.startsAt) return 'upcoming';
  if (now <= t.endsAt) return 'live';
  return 'ended';
}

/** Bonus leaderboard points for winning a whole knockout run. */
export const CHAMPION_POINTS = 300;

export function tournamentPoints(r: MatchResult): number {
  const champion = knockoutOutcome(r)?.kind === 'champion' ? CHAMPION_POINTS : 0;
  return (r.won ? 100 : 0) + r.tasks * 10 + r.infections * 15 + Math.floor(r.secondsSurvived / 10) + champion;
}

// ---- Knockout -------------------------------------------------------------------------------

export type KnockoutOutcome =
  | { kind: 'advance'; nextSize: number }
  | { kind: 'champion' }
  /** 2 = lost the final, 3 = lost the semi-final, 4 = out earlier. */
  | { kind: 'out'; place: 2 | 3 | 4 };

/** What a knockout round result means for the local player. */
export function knockoutOutcome(r: MatchResult): KnockoutOutcome | null {
  if (r.mode !== 'tournament') return null;
  const size = r.roundSize ?? 2;
  if (r.won) {
    const next = r.advancing ?? 1;
    return next <= 1 ? { kind: 'champion' } : { kind: 'advance', nextSize: next };
  }
  return { kind: 'out', place: size <= 2 ? 2 : size <= 4 ? 3 : 4 };
}

/** Name of the round played with `size` players. */
export function roundName(size: number): string {
  if (size <= 2) return 'Final';
  if (size <= 4) return 'Semi-final';
  if (size <= 8) return 'Quarter-final';
  return 'Opening round';
}

/** The prize for finishing a run, or null while the run is still going. */
export function knockoutPrize(t: Tournament, o: KnockoutOutcome): TournamentPrize | null {
  if (o.kind === 'advance') return null;
  if (o.kind === 'champion') return t.prizes[0];
  return t.prizes[o.place - 1] ?? t.prizes[t.prizes.length - 1];
}

export const PRIZE_LABELS = ['Champion', 'Final', 'Semi-final', 'Participation'];

export interface LeaderboardEntry {
  uid: string;
  name: string;
  points: number;
  isBot?: boolean;
}

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RIVALS = ['ZombieKing', 'NightNinja', 'Survivor99', 'DrDeath', 'BrainEater', 'TheShadow', 'Rex_IL', 'ZombieQueen', 'Speedy', 'SuperHero'];

/** Offline-mode rivals whose scores grow over the tournament window. */
export function simulatedRivals(t: Tournament, now: number): LeaderboardEntry[] {
  let h = 0;
  for (const ch of t.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rng = seeded(h);
  const frac = Math.max(0, Math.min(1, (now - t.startsAt) / (t.endsAt - t.startsAt)));
  const scale = (t.endsAt - t.startsAt) / HOUR;
  return RIVALS.slice(0, 7).map((name, i) => ({
    uid: `rival-${i}`,
    name,
    points: Math.round(rng() * 900 * Math.sqrt(scale) * frac),
    isBot: true,
  }));
}

export function rankOf(entries: LeaderboardEntry[], uid: string): number {
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  return sorted.findIndex((e) => e.uid === uid) + 1;
}

export function registerForTournament(p: Profile, t: Tournament): Profile {
  if (p.tournaments[t.id]) return p;
  return { ...p, tournaments: { ...p.tournaments, [t.id]: { tournamentId: t.id, points: 0, claimed: false, endsAt: t.endsAt } } };
}

