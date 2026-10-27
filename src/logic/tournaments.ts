// Scheduled tournaments. The schedule is computed from the clock so every client agrees on it
// without a server; scores live in Firestore when online (simulated rivals when offline).
import type { MatchResult, Profile } from '../types.ts';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  icon: string;
  startsAt: number;
  endsAt: number;
  prizes: { coins: number; medals: number; skin?: string }[]; // index = rank - 1; last = participation
}

const HOUR = 3600_000;

function stamp(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function rush(start: Date): Tournament {
  return {
    id: `rush-${stamp(start)}-${String(start.getHours()).padStart(2, '0')}`,
    name: 'ריצת בהלה',
    description: 'טורניר בזק של שעה. כל משחק טורניר צובר נקודות.',
    icon: '⚡',
    startsAt: start.getTime(),
    endsAt: start.getTime() + HOUR,
    prizes: [{ coins: 400, medals: 4 }, { coins: 250, medals: 2 }, { coins: 150, medals: 1 }, { coins: 30, medals: 0 }],
  };
}

function night(start: Date): Tournament {
  return {
    id: `night-${stamp(start)}`,
    name: 'התפרצות לילית',
    description: 'כל ערב 20:00–22:00. פרסים גדולים למובילים.',
    icon: '🌙',
    startsAt: start.getTime(),
    endsAt: start.getTime() + 2 * HOUR,
    prizes: [{ coins: 1000, medals: 8 }, { coins: 600, medals: 5 }, { coins: 300, medals: 3 }, { coins: 60, medals: 0 }],
  };
}

function cup(start: Date): Tournament {
  return {
    id: `cup-${stamp(start)}`,
    name: 'גביע האפוקליפסה',
    description: 'טורניר סוף השבוע. המקום הראשון זוכה בסקין הבלעדי "אלוף הטורניר"!',
    icon: '🏆',
    startsAt: start.getTime(),
    endsAt: start.getTime() + 28 * HOUR,
    prizes: [{ coins: 3000, medals: 20, skin: 'champion' }, { coins: 1500, medals: 12 }, { coins: 800, medals: 6 }, { coins: 100, medals: 1 }],
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

export function tournamentPoints(r: MatchResult): number {
  return (r.won ? 100 : 0) + r.tasks * 10 + r.infections * 15 + Math.floor(r.secondsSurvived / 10);
}

export function prizeForRank(t: Tournament, rank: number) {
  return rank >= 1 && rank <= 3 ? t.prizes[rank - 1] : t.prizes[t.prizes.length - 1];
}

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

const RIVALS = ['ZombieKing', 'נינג׳ה_לילה', 'Survivor99', 'דוקטור_מוות', 'BrainEater', 'הצל', 'Rex_IL', 'מלכת_הזומבים', 'Speedy', 'גיבור_על'];

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

export function claimTournamentPrize(p: Profile, t: Tournament, rank: number, now: number): Profile | null {
  const entry = p.tournaments[t.id];
  if (!entry || entry.claimed || now <= t.endsAt) return null;
  const prize = prizeForRank(t, rank);
  const ownedSkins = prize.skin && !p.ownedSkins.includes(prize.skin) ? [...p.ownedSkins, prize.skin] : p.ownedSkins;
  return {
    ...p,
    coins: p.coins + prize.coins,
    medals: p.medals + prize.medals,
    ownedSkins,
    tournaments: { ...p.tournaments, [t.id]: { ...entry, claimed: true } },
  };
}
