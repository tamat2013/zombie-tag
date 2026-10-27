// Pure game-progression rules: levels, rewards, stats, achievements. No React Native imports.
import type { MatchResult, PlayerStats, Profile, StatKey, TaskType } from '../types.ts';
import { DEFAULT_LOADOUT, FREE_ABILITIES } from '../engine/abilities.ts';
import { DEFAULT_SKIN_ID, STARTER_SKINS } from '../data/skins.ts';
import { findBuiltInMap } from '../data/maps.ts';
import { ensureMissions } from './missions.ts';
import { tournamentPoints, getTournamentById } from './tournaments.ts';

export const MAX_LEVEL = 50;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 60;
}

export function levelInfo(xp: number): { level: number; into: number; needed: number; progress: number } {
  let level = 1;
  let remaining = xp;
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  const needed = level >= MAX_LEVEL ? 1 : xpToNext(level);
  return { level, into: remaining, needed, progress: level >= MAX_LEVEL ? 1 : remaining / needed };
}

export function emptyStats(): PlayerStats {
  return {
    matchesPlayed: 0, wins: 0, survivorWins: 0, zombieWins: 0, tasksCompleted: 0, infections: 0,
    secondsSurvived: 0, abilitiesUsed: 0, obstacleRuns: 0, obstacleGolds: 0, tournamentMatches: 0,
    skinsCreated: 0, mapsCreated: 0, wiresTasks: 0, machineTasks: 0, downloadTasks: 0, trashTasks: 0,
    temperatureTasks: 0,
  };
}

export function createDefaultProfile(uid: string, displayName: string, email: string, now: number): Profile {
  const base: Profile = {
    uid,
    displayName,
    email,
    xp: 0,
    coins: 300,
    medals: 0,
    ownedSkins: [...STARTER_SKINS],
    selectedSkinId: DEFAULT_SKIN_ID,
    customSkins: [],
    ownedOutfits: [],
    equippedOutfit: null,
    ownedAbilities: [...FREE_ABILITIES],
    loadout: { survivor: [...DEFAULT_LOADOUT.survivor], zombie: [...DEFAULT_LOADOUT.zombie] },
    upgrades: { speed: 0, cooldown: 0, vision: 0, taskSpeed: 0, reach: 0 },
    ownedFilters: ['classic'],
    equippedFilter: 'classic',
    stats: emptyStats(),
    missions: {
      dailyKey: '', dailyBaseline: emptyStats(), dailyClaimed: [],
      weeklyKey: '', weeklyBaseline: emptyStats(), weeklyClaimed: [],
    },
    achievements: [],
    bestObstacleTimes: {},
    obstacleMedals: {},
    tournaments: {},
    createdAt: now,
  };
  return ensureMissions(base, now);
}

/** Fills in fields added in later versions so old saved profiles keep working. */
export function normalizeProfile(raw: Partial<Profile> & { uid: string }, now: number): Profile {
  const def = createDefaultProfile(raw.uid, raw.displayName ?? 'שחקן', raw.email ?? '', now);
  const merged: Profile = {
    ...def,
    ...raw,
    stats: { ...def.stats, ...(raw.stats ?? {}) },
    upgrades: { ...def.upgrades, ...(raw.upgrades ?? {}) },
    loadout: { ...def.loadout, ...(raw.loadout ?? {}) },
    missions: { ...def.missions, ...(raw.missions ?? {}) },
  } as Profile;
  return ensureMissions(merged, now);
}

const TASK_STAT: Record<TaskType, StatKey> = {
  wires: 'wiresTasks',
  machine: 'machineTasks',
  download: 'downloadTasks',
  trash: 'trashTasks',
  temperature: 'temperatureTasks',
};

export interface RewardLine {
  label: string;
  xp: number;
  coins: number;
  medals?: number;
}

export interface Rewards {
  xp: number;
  coins: number;
  medals: number;
  lines: RewardLine[];
}

export type MedalTier = 'gold' | 'silver' | 'bronze';
const MEDAL_VALUE: Record<MedalTier, number> = { gold: 3, silver: 2, bronze: 1 };

export function obstacleMedal(mapId: string, timeMs: number, medalTimes?: [number, number, number]): MedalTier | null {
  const times = medalTimes ?? findBuiltInMap(mapId)?.medalTimes ?? [40, 60, 90];
  const s = timeMs / 1000;
  if (s <= times[0]) return 'gold';
  if (s <= times[1]) return 'silver';
  if (s <= times[2]) return 'bronze';
  return null;
}

export function computeRewards(result: MatchResult, profile: Profile, medalTimes?: [number, number, number]): Rewards {
  const lines: RewardLine[] = [];
  if (result.mode === 'obstacle') {
    if (result.obstacleTimeMs === undefined) {
      lines.push({ label: 'השתתפות', xp: 10, coins: 0 });
    } else {
      lines.push({ label: 'סיום המסלול', xp: 60, coins: 20 });
      const medal = obstacleMedal(result.mapId, result.obstacleTimeMs, medalTimes);
      const prev = profile.obstacleMedals[result.mapId];
      if (medal) {
        const gained = MEDAL_VALUE[medal] - (prev ? MEDAL_VALUE[prev] : 0);
        if (gained > 0) lines.push({ label: `מדליה חדשה (${medalName(medal)})`, xp: 40 * gained, coins: 0, medals: gained });
      }
      const best = profile.bestObstacleTimes[result.mapId];
      if (best !== undefined && result.obstacleTimeMs < best) lines.push({ label: 'שיא אישי!', xp: 30, coins: 30 });
    }
  } else {
    lines.push({ label: 'השתתפות', xp: 20, coins: 10 });
    if (result.tasks) lines.push({ label: `${result.tasks} משימות`, xp: result.tasks * 25, coins: result.tasks * 5 });
    if (result.infections) lines.push({ label: `${result.infections} הדבקות`, xp: result.infections * 30, coins: result.infections * 10 });
    if (result.secondsSurvived) {
      lines.push({
        label: `שרדת ${formatSeconds(result.secondsSurvived)}`,
        xp: Math.min(100, Math.floor(result.secondsSurvived / 6)),
        coins: Math.floor(result.secondsSurvived / 20),
      });
    }
    if (result.won) lines.push({ label: 'ניצחון!', xp: 100, coins: 50 });
  }
  let xp = lines.reduce((s, l) => s + l.xp, 0);
  let coins = lines.reduce((s, l) => s + l.coins, 0);
  const medals = lines.reduce((s, l) => s + (l.medals ?? 0), 0);
  if (result.mode === 'training') {
    xp = Math.round(xp * 0.5);
    coins = Math.round(coins * 0.3);
    lines.push({ label: 'אימון: ‎50% XP, 30% מטבעות', xp: 0, coins: 0 });
  }
  return { xp, coins, medals, lines };
}

export function medalName(m: MedalTier): string {
  return m === 'gold' ? 'זהב' : m === 'silver' ? 'כסף' : 'ארד';
}

export function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface AppliedMatch {
  profile: Profile;
  rewards: Rewards;
  levelBefore: number;
  levelAfter: number;
  newAchievements: AchievementDef[];
  tournamentPointsGained: number;
}

export function applyMatchResult(profile: Profile, result: MatchResult, now: number, medalTimes?: [number, number, number]): AppliedMatch {
  const rewards = computeRewards(result, profile, medalTimes);
  const stats = { ...profile.stats };
  const p: Profile = {
    ...profile,
    stats,
    bestObstacleTimes: { ...profile.bestObstacleTimes },
    obstacleMedals: { ...profile.obstacleMedals },
    tournaments: { ...profile.tournaments },
  };
  if (result.mode === 'obstacle') {
    stats.obstacleRuns++;
    if (result.obstacleTimeMs !== undefined) {
      const best = p.bestObstacleTimes[result.mapId];
      if (best === undefined || result.obstacleTimeMs < best) p.bestObstacleTimes[result.mapId] = result.obstacleTimeMs;
      const medal = obstacleMedal(result.mapId, result.obstacleTimeMs, medalTimes);
      const prev = p.obstacleMedals[result.mapId];
      if (medal && (!prev || MEDAL_VALUE[medal] > MEDAL_VALUE[prev])) p.obstacleMedals[result.mapId] = medal;
      if (medal === 'gold') stats.obstacleGolds++;
    }
  } else {
    stats.matchesPlayed++;
    stats.tasksCompleted += result.tasks;
    stats.infections += result.infections;
    stats.secondsSurvived += result.secondsSurvived;
    stats.abilitiesUsed += result.abilitiesUsed;
    for (const [type, n] of Object.entries(result.tasksByType)) stats[TASK_STAT[type as TaskType]] += n ?? 0;
    if (result.won) {
      stats.wins++;
      if (result.finalRole === 'survivor') stats.survivorWins++;
      else stats.zombieWins++;
    }
  }

  let tournamentPointsGained = 0;
  if (result.mode === 'tournament' && result.tournamentId) {
    const t = getTournamentById(result.tournamentId, now);
    const entry = p.tournaments[result.tournamentId];
    if (t && entry && now >= t.startsAt && now <= t.endsAt) {
      tournamentPointsGained = tournamentPoints(result);
      p.tournaments[result.tournamentId] = { ...entry, points: entry.points + tournamentPointsGained };
      stats.tournamentMatches++;
    }
  }

  const levelBefore = levelInfo(profile.xp).level;
  p.xp += rewards.xp;
  p.coins += rewards.coins;
  p.medals += rewards.medals;
  const unlocked = checkAchievements(p);
  const withAch = grantAchievements(p, unlocked);
  return {
    profile: withAch,
    rewards,
    levelBefore,
    levelAfter: levelInfo(withAch.xp).level,
    newAchievements: unlocked,
    tournamentPointsGained,
  };
}

// ---- Achievements ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  badge: string;
  coins: number;
  medals: number;
  check: (p: Profile) => boolean;
  progress: (p: Profile) => [number, number];
}

function statAch(id: string, title: string, badge: string, stat: StatKey, target: number, coins: number, medals: number, description: string): AchievementDef {
  return {
    id, title, badge, coins, medals, description,
    check: (p) => p.stats[stat] >= target,
    progress: (p) => [Math.min(p.stats[stat], target), target],
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  statAch('first_match', 'צעד ראשון', '🎮', 'matchesPlayed', 1, 50, 0, 'שחק משחק ראשון'),
  statAch('first_win', 'ניצחון ראשון', '🏅', 'wins', 1, 100, 1, 'נצח במשחק'),
  statAch('wins_25', 'מנצח סדרתי', '🏆', 'wins', 25, 500, 5, 'נצח ב-25 משחקים'),
  statAch('tasks_10', 'עובד חרוץ', '🔧', 'tasksCompleted', 10, 100, 1, 'השלם 10 משימות'),
  statAch('tasks_100', 'מהנדס ראשי', '⚙️', 'tasksCompleted', 100, 600, 5, 'השלם 100 משימות'),
  statAch('infect_10', 'מגפה מתפשטת', '🧟', 'infections', 10, 150, 1, 'הדבק 10 שורדים'),
  statAch('infect_100', 'אפוקליפסה', '☣️', 'infections', 100, 800, 6, 'הדבק 100 שורדים'),
  statAch('survivor_10', 'שורד אמיתי', '🛡️', 'survivorWins', 10, 400, 3, 'נצח 10 פעמים כשורד'),
  statAch('survive_hour', 'שעה בחיים', '⏱️', 'secondsSurvived', 3600, 300, 2, 'שרוד שעה מצטברת'),
  statAch('abilities_50', 'מומחה יכולות', '✨', 'abilitiesUsed', 50, 200, 1, 'השתמש ב-50 יכולות'),
  statAch('obstacle_gold', 'זריז כמו ברק', '🥇', 'obstacleGolds', 1, 200, 2, 'השג מדליית זהב במסלול מכשולים'),
  statAch('tournament_5', 'לוחם טורנירים', '⚔️', 'tournamentMatches', 5, 300, 2, 'שחק 5 משחקי טורניר'),
  statAch('designer', 'מעצב אופנה', '🎨', 'skinsCreated', 1, 100, 0, 'צור סקין משלך'),
  statAch('architect', 'אדריכל', '🗺️', 'mapsCreated', 1, 150, 1, 'צור מפה משלך'),
  {
    id: 'level_10', title: 'ותיק', badge: '🔟', coins: 500, medals: 3, description: 'הגע לרמה 10',
    check: (p) => levelInfo(p.xp).level >= 10,
    progress: (p) => [Math.min(levelInfo(p.xp).level, 10), 10],
  },
  {
    id: 'collector', title: 'אספן', badge: '👕', coins: 400, medals: 2, description: 'החזק 6 סקינים',
    check: (p) => p.ownedSkins.length + p.customSkins.length >= 6,
    progress: (p) => [Math.min(p.ownedSkins.length + p.customSkins.length, 6), 6],
  },
];

export function checkAchievements(p: Profile): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !p.achievements.includes(a.id) && a.check(p));
}

export function grantAchievements(p: Profile, list: AchievementDef[]): Profile {
  if (!list.length) return p;
  return {
    ...p,
    achievements: [...p.achievements, ...list.map((a) => a.id)],
    coins: p.coins + list.reduce((s, a) => s + a.coins, 0),
    medals: p.medals + list.reduce((s, a) => s + a.medals, 0),
  };
}

/** Bumps a stat outside a match (e.g. skin or map created) and grants any achievements. */
export function bumpStat(p: Profile, stat: StatKey, by = 1): { profile: Profile; unlocked: AchievementDef[] } {
  const next = { ...p, stats: { ...p.stats, [stat]: p.stats[stat] + by } };
  const unlocked = checkAchievements(next);
  return { profile: grantAchievements(next, unlocked), unlocked };
}
